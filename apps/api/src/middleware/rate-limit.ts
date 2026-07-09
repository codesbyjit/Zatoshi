import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../db/redis';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:rate-limit');

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Custom Redis-based sliding window rate limiter.
 *
 * Uses a sorted set per key where each request is a member with score = current timestamp.
 * The window is [now - windowMs, now].
 *
 * @param key - Unique rate limit key (e.g. `rate-limit:auth:1.2.3.4`)
 * @param maxRequests - Maximum number of requests in the window
 * @param windowMs - Window duration in milliseconds
 * @returns RateLimitResult
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();

  // If Redis is unavailable, allow the request through (degraded mode)
  if (!redis) {
    return { allowed: true, remaining: maxRequests, resetTime: now + windowMs, limit: maxRequests };
  }

  const windowStart = now - windowMs;

  const multi = redis.multi();

  // Remove entries outside the sliding window
  multi.zremrangebyscore(key, 0, windowStart);

  // Count entries in current window
  multi.zcard(key);

  // Add current request
  multi.zadd(key, now, `${now}:${Math.random()}`);

  // Set TTL on the key
  multi.pexpire(key, windowMs);

  const results = await multi.exec();

  if (!results) {
    // Redis error — allow the request
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs, limit: maxRequests };
  }

  const count = (results[1][1] as number) + 1; // +1 because we already added this request
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetTime = now + windowMs;

  return { allowed, remaining, resetTime, limit: maxRequests };
}

/**
 * Creates an Express middleware for rate limiting.
 *
 * @param getKey - Function to derive the rate limit key from the request
 * @param maxRequests - Maximum requests in the window
 * @param windowMs - Window duration in milliseconds
 * @param name - Name for logging
 */
export function createRateLimiter(
  getKey: (req: Request) => string,
  maxRequests: number,
  windowMs: number,
  name: string,
) {
  return async function rateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const key = `rate-limit:${name}:${getKey(req)}`;
      const result = await checkRateLimit(key, maxRequests, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        logger.warn({ key, limit: maxRequests }, 'Rate limit exceeded');
        res.status(429).json({
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
          },
        });
        return;
      }

      next();
    } catch (err) {
      logger.error({ err, name }, 'Rate limiter error — allowing request');
      next();
    }
  };
}

/**
 * Pre-built rate limiters for auth and general API endpoints.
 */
export const authRateLimiter = createRateLimiter(
  (req) => req.ip || 'unknown',
  1000, // 1000 requests/minute (generous for dev/test)
  60 * 1000, // per minute
  'auth',
);

export const apiRateLimiter = createRateLimiter(
  (req) => req.ip || 'unknown',
  1000, // 1000 requests/minute (generous for dev/test)
  60 * 1000, // per minute
  'api',
);
