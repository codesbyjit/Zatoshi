import Redis from 'ioredis';
import { getLogger } from '@repo/utils';
import { config } from '../config';

const logger = getLogger('worker:redis');

let redis: Redis | null = null;

/**
 * Create a Redis client with auto-reconnect and return it once the
 * connection is established (or retries are exhausted).
 *
 * When Redis is unreachable (e.g. Docker not running), the retry strategy
 * makes up to 5 attempts before giving up and rejecting the promise.
 */
export async function connectRedis(): Promise<Redis | null> {
  if (redis) {
    return redis;
  }

  logger.info({ url: config.redisUrl }, 'Connecting to Redis...');

  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    retryStrategy(times) {
      if (times > 5) {
        logger.error('Redis max retries reached, giving up');
        return null; // stop retrying — connect() will reject
      }
      const delay = Math.min(times * 200, 2000);
      logger.info({ attempt: times, delay }, 'Redis reconnecting...');
      return delay;
    },
    // lazyConnect: false (default) — ioredis connects on construction
  });

  // ── Event handlers ────────────────────────────────────────────
  redis.on('connect', () => {
    logger.info('Redis connect handler fired');
  });

  redis.on('ready', () => {
    logger.info('Redis ready');
  });

  redis.on('error', (err) => {
    // ioredis emits 'error' for every failed attempt — don't crash on it
    logger.error({ err }, 'Redis connection error');
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  // ── Wait for connection or failure ────────────────────────────
  // With lazyConnect: false (default), ioredis connects immediately.
  // We wait for the 'ready' event (Redis handshake complete), or reject
  // when the retry strategy gives up (connection becomes 'close'/'end').
  //
  // ioredis event order on failure:
  //   1. 'error' — status is still 'reconnecting' at this point
  //   2. 'close'  — status changes to 'close'
  // So we must listen for both: 'error' alone isn't sufficient.
  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onClose = () => {
        // Reject only when retryStrategy gave up (status is 'close' or 'end').
        // Transient reconnections still have status 'connect' or 'reconnecting'.
        if (redis?.status === 'close' || redis?.status === 'end') {
          cleanup();
          reject(new Error('Redis connection failed — check that Redis is running'));
        }
      };
      const cleanup = () => {
        redis?.off('ready', onReady);
        redis?.off('close', onClose);
      };

      redis!.on('ready', onReady);
      redis!.on('close', onClose);

      // If already connected (synchronous case), resolve immediately
      if (redis!.status === 'ready') {
        cleanup();
        resolve();
      }
    });
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — running in degraded mode (no event streaming)');
    redis = null;
    return null;
  }

  logger.info('Redis connected successfully');
  return redis;
}

/**
 * Get the current Redis instance. Returns null if not connected (degraded mode).
 */
export function getRedis(): Redis | null {
  if (redis && redis.status !== 'ready') {
    logger.warn({ status: redis.status }, 'Redis not ready — returning null');
    redis = null;
    return null;
  }
  return redis;
}

/**
 * Gracefully quit the Redis connection.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    logger.info('Disconnecting from Redis...');
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
  // No-op if already null (degraded mode)
}

/**
 * Ensure the Redis stream and consumer group exist.
 * Creates them if they don't, ignoring the BUSYGROUP error on re-creation.
 * No-op when Redis is unavailable (degraded mode).
 */
export async function ensureStreamAndGroup(): Promise<void> {
  const r = getRedis();
  if (!r) {
    logger.warn('Redis unavailable — skipping stream setup');
    return;
  }
  try {
    await r.xgroup('CREATE', config.redisStream, config.redisConsumerGroup, '$', 'MKSTREAM');
    logger.info(
      { stream: config.redisStream, group: config.redisConsumerGroup },
      'Redis stream and consumer group created',
    );
  } catch (err: unknown) {
    // BUSYGROUP means the group already exists — that's fine
    if (err instanceof Error && err.message.includes('BUSYGROUP')) {
      logger.debug('Consumer group already exists');
    } else {
      throw err;
    }
  }
}
