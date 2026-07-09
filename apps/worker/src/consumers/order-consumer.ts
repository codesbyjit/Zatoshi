import { getLogger } from '@repo/utils';
import type Redis from 'ioredis';
import { config } from '../config';
import { getRedis } from '../db/redis';
import { handleOrderPlaced } from '../handlers/order-placed';
import { withRetry } from '../utils/retry';

type StreamMessage = [messageId: string, fields: string[]];
type StreamEntry = [streamName: string, messages: StreamMessage[]];

const logger = getLogger('worker:consumer:order');

const SUPPORTED_EVENTS = new Set(['order.placed', 'order.status_changed']);

let reading = false;
let shouldStop = false;

/**
 * Start the order event consumer.
 *
 * Reads from the `ecommerce:events` Redis Stream as part of the
 * `ecommerce:worker-group` consumer group. Filters for order-related
 * events and dispatches them to the appropriate handler.
 */
export function startOrderConsumer(): void {
  logger.info('Starting order event consumer');
  shouldStop = false;
  readLoop().catch((err) => {
    logger.fatal({ err }, 'Order consumer crashed');
  });
}

/**
 * Stop the order event consumer gracefully.
 */
export function stopOrderConsumer(): void {
  shouldStop = true;
  logger.info('Order consumer stopping...');
}

/**
 * Main read loop: blocks on XREADGROUP for new messages, dispatches
 * matching events, and acknowledges them on success.
 */
async function readLoop(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    logger.error('Redis unavailable — order consumer cannot run');
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
        logger.error({ err }, 'Error reading from order consumer stream');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  reading = false;
  logger.info('Order consumer stopped');
}

/**
 * Process a single stream message.
 */
async function processMessage(
  redis: Redis,
  messageId: string,
  fields: string[],
): Promise<void> {
  // Fields are interleaved: [key1, val1, key2, val2, ...]
  const msg: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    msg[fields[i]] = fields[i + 1];
  }

  const eventType = msg['type'];
  if (!eventType || !SUPPORTED_EVENTS.has(eventType)) {
    // Not our event — acknowledge and skip
    await redis.xack(config.redisStream, config.redisConsumerGroup, messageId);
    return;
  }

  logger.debug({ messageId, eventType }, 'Processing order event');

  try {
    let payload: Record<string, unknown> = {};
    if (msg['payload']) {
      payload = JSON.parse(msg['payload']);
    }

    switch (eventType) {
      case 'order.placed':
        await withRetry(
          () => handleOrderPlaced(payload as any),
          { maxRetries: 2, baseDelayMs: 500, label: `order-placed-${messageId}` },
        );
        break;

      case 'order.status_changed':
        // Future: handle order status change events
        logger.info({ payload }, 'Order status changed event received (no-op)');
        break;
    }

    // Acknowledge the message
    await redis.xack(config.redisStream, config.redisConsumerGroup, messageId);
    logger.debug({ messageId, eventType }, 'Order event acknowledged');
  } catch (err) {
    logger.error(
      { messageId, eventType, err },
      'Failed to process order event — will be retried',
    );
    // Do NOT XACK — the message will be redelivered by Redis
  }
}
