import Redis from 'ioredis';

import { config } from '../config';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:redis');

let redis: Redis | null = null;

export async function connectRedis(): Promise<Redis | null> {
  if (redis) return redis;

  logger.info({ url: sanitizeUri(config.redisUrl) }, 'Connecting to Redis');

  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    retryStrategy(times) {
      if (times > 5) {
        logger.error('Redis connection failed after 5 retries');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('ready', () => {
    logger.info('Redis ready');
  });

  // Wait for ready event, or handle connection failure gracefully
  // Note: use 'close' not 'error' because ioredis emits 'error' first
  // (status still 'reconnecting') then 'close' (status becomes 'close').
  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onClose = () => {
        if (redis?.status === 'close' || redis?.status === 'end') {
          cleanup();
          reject(new Error('Redis connection failed'));
        }
      };
      const cleanup = () => {
        redis?.off('ready', onReady);
        redis?.off('close', onClose);
      };

      redis!.on('ready', onReady);
      redis!.on('close', onClose);

      if (redis!.status === 'ready') {
        cleanup();
        resolve();
      }
    });
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — running in degraded mode (no caching, rate limiting, or pub/sub)');
    redis = null;
    return null;
  }

  return redis;
}

export function getRedis(): Redis | null {
  if (redis && redis.status !== 'ready') {
    logger.warn({ status: redis.status }, 'Redis not ready — returning null');
    redis = null;
    return null;
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}

/**
 * Add a refresh token to the blacklist with TTL matching the token expiry.
 * No-op when Redis is unavailable (degraded mode).
 */
export async function blacklistRefreshToken(
  token: string,
  ttlSeconds: number = 7 * 24 * 3600,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(`blacklist:refresh:${token}`, '1', 'EX', ttlSeconds);
}

/**
 * Check if a refresh token is blacklisted.
 * Returns false when Redis is unavailable (degraded mode).
 */
export async function isRefreshTokenBlacklisted(
  token: string,
): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  const result = await r.get(`blacklist:refresh:${token}`);
  return result !== null;
}

/**
 * Store a refresh token in Redis associated with a user.
 * No-op when Redis is unavailable (degraded mode).
 */
export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  ttlSeconds: number = 7 * 24 * 3600,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(`refresh:${userId}`, refreshToken, 'EX', ttlSeconds);
}

/**
 * Get the stored refresh token for a user.
 * Returns null when Redis is unavailable or token not found.
 */
export async function getStoredRefreshToken(
  userId: string,
): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get(`refresh:${userId}`);
}

/**
 * Delete a stored refresh token for a user.
 * No-op when Redis is unavailable (degraded mode).
 */
export async function deleteRefreshToken(
  userId: string,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(`refresh:${userId}`);
}

function sanitizeUri(uri: string): string {
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return uri;
  }
}
