import { getLogger } from '@repo/utils';
import type Redis from 'ioredis';
import { config } from '../config';
import { getRedis } from '../db/redis';
import { handlePaymentProcessed } from '../handlers/payment-processed';
import { withRetry } from '../utils/retry';

type StreamMessage = [messageId: string, fields: string[]];
type StreamEntry = [streamName: string, messages: StreamMessage[]];

const logger = getLogger('worker:consumer:payment');

const SUPPORTED_EVENTS = new Set(['payment.processed', 'payment.failed']);

let shouldStop = false;

/**
 * Start the payment event consumer.
 *
 * Reads from the `ecommerce:events` Redis Stream as part of the
 * `ecommerce:worker-group` consumer group. Filters for payment-related
 * events and dispatches them to the appropriate handler.
 */
export function startPaymentConsumer(): void {
  logger.info('Starting payment event consumer');
  shouldStop = false;
  readLoop().catch((err) => {
    logger.fatal({ err }, 'Payment consumer crashed');
  });
}

/**
 * Stop the payment event consumer gracefully.
 */
export function stopPaymentConsumer(): void {
  shouldStop = true;
  logger.info('Payment consumer stopping...');
}

/**
 * Main read loop: blocks on XREADGROUP for new messages.
 */
async function readLoop(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    logger.error('Redis unavailable — payment consumer cannot run');
    return;
  }

  while (!shouldStop) {
    try {
      const results = (await redis.xreadgroup(
        'GROUP',
        config.redisConsumerGroup,
        config.redisConsumerName,
        'COUNT',
        10,
        'BLOCK',
        config.redisBlockMs,
        'STREAMS',
        config.redisStream,
        '>',
      )) as StreamEntry[];

      if (!results || results.length === 0) {
        continue;
      }

      for (const [, messages] of results) {
        for (const [messageId, fields] of messages) {
          await processMessage(redis, messageId, fields);
        }
      }
    } catch (err) {
      if (!shouldStop) {
        logger.error({ err }, 'Error reading from payment consumer stream');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  logger.info('Payment consumer stopped');
}

/**
 * Process a single stream message.
 */
async function processMessage(
  redis: Redis,
  messageId: string,
  fields: string[],
): Promise<void> {
  const msg: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    msg[fields[i]] = fields[i + 1];
  }

  const eventType = msg['type'];
  if (!eventType || !SUPPORTED_EVENTS.has(eventType)) {
    await redis.xack(config.redisStream, config.redisConsumerGroup, messageId);
    return;
  }

  logger.debug({ messageId, eventType }, 'Processing payment event');

  try {
    let payload: Record<string, unknown> = {};
    if (msg['payload']) {
      payload = JSON.parse(msg['payload']);
    }

    switch (eventType) {
      case 'payment.processed':
      case 'payment.failed':
        await withRetry(
          () => handlePaymentProcessed(payload as any),
          {
            maxRetries: 2,
            baseDelayMs: 500,
            label: `payment-${eventType}-${messageId}`,
          },
        );
        break;
    }

    await redis.xack(config.redisStream, config.redisConsumerGroup, messageId);
    logger.debug({ messageId, eventType }, 'Payment event acknowledged');
  } catch (err) {
    logger.error(
      { messageId, eventType, err },
      'Failed to process payment event — will be retried',
    );
    // Do NOT XACK — message will be redelivered
  }
}
