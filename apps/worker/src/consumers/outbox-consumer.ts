import { getLogger } from '@repo/utils';
import { OUTBOX_COLLECTION } from '@repo/types';
import type { Outbox } from '@repo/types';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type Redis from 'ioredis';
import { config } from '../config';
import { getDb } from '../db/client';
import { getRedis } from '../db/redis';
import { sendToDLQ } from '../utils/dlq';

const logger = getLogger('worker:consumer:outbox');

let pollingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the outbox polling loop.
 *
 * Every `pollIntervalMs`, we query the outbox collection for pending events
 * and attempt to publish them to the Redis stream.
 */
export function startOutboxConsumer(): void {
  logger.info(
    { pollIntervalMs: config.pollIntervalMs, batchSize: config.outboxBatchSize },
    'Starting outbox consumer',
  );

  // Run immediately, then on the interval
  pollOnce();
  pollingInterval = setInterval(pollOnce, config.pollIntervalMs);
}

/**
 * Stop the outbox polling loop.
 */
export function stopOutboxConsumer(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('Outbox consumer stopped');
  }
}

/**
 * Single poll cycle:
 * 1. Query pending outbox records
 * 2. Publish each to Redis Stream
 * 3. Mark as published or increment retryCount
 */
async function pollOnce(): Promise<void> {
  try {
    const db = getDb();
    const redis = getRedis();

    if (!redis) {
      logger.warn('Redis unavailable — outbox consumer cannot publish');
      return;
    }

    const records = await fetchPendingRecords(db);

    if (records.length === 0) {
      return;
    }

    logger.debug({ count: records.length }, 'Processing outbox records');

    for (const record of records) {
      await processRecord(db, redis, record);
    }
  } catch (err) {
    logger.error({ err }, 'Outbox poll cycle failed');
  }
}

/**
 * Fetch pending outbox records from MongoDB.
 */
async function fetchPendingRecords(db: Db): Promise<Outbox[]> {
  const records = await db
    .collection(OUTBOX_COLLECTION)
    .find({
      status: 'pending',
      retryCount: { $lt: config.maxRetries },
    })
    .sort({ createdAt: 1 })
    .limit(config.outboxBatchSize)
    .toArray();

  return records as unknown as Outbox[];
}

/**
 * Process a single outbox record:
 * 1. Publish to Redis Stream
 * 2. On success → mark as published
 * 3. On failure → increment retryCount, optionally send to DLQ
 */
async function processRecord(
  db: Db,
  redis: Redis,
  record: Outbox,
): Promise<void> {
  const { _id, eventType, eventId, payload, retryCount } = record;

  try {
    // Publish to Redis Stream
    await redis.xadd(
      config.redisStream,
      '*',
      'type',
      eventType,
      'payload',
      JSON.stringify(payload),
      'eventId',
      eventId,
    );

    // Mark as published
    await db.collection(OUTBOX_COLLECTION).updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          status: 'published',
          publishedAt: new Date(),
        },
      },
    );

    logger.debug({ eventType, eventId }, 'Outbox record published to Redis Stream');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error(
      { eventType, eventId, error: errorMessage, retryCount },
      'Failed to publish outbox record',
    );

    const newRetryCount = retryCount + 1;
    const isFailed = newRetryCount >= config.maxRetries;

    // Update the record with failure info
    await db.collection(OUTBOX_COLLECTION).updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          status: isFailed ? 'failed' : 'pending',
          lastError: errorMessage,
          retryCount: newRetryCount,
        },
      },
    );

    // If max retries exceeded, send to Dead Letter Queue
    if (isFailed) {
      logger.warn(
        { eventType, eventId, retryCount: newRetryCount },
        'Outbox record exceeded max retries, sending to DLQ',
      );

      await sendToDLQ({
        originalEventType: eventType,
        originalPayload: payload,
        errorMessage,
        retryCount: newRetryCount,
        failedAt: new Date(),
      });
    }
  }
}
