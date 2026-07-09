import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { Db } from 'mongodb';
import type { Redis } from 'ioredis';
import type { JwtPayload } from '../utils/jwt';
import { verifyAccessToken } from '../utils/jwt';
import { getDb } from '../db/client';
import { getRedis } from '../db/redis';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:trpc-context');

/**
 * tRPC context that provides db, redis, and the authenticated user.
 */
export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<Context> {
  const { req, res } = opts;

  // Extract user from JWT if present (Bearer header OR httpOnly cookie)
  let user: JwtPayload | null = null;

  // Prefer Authorization header, fall back to accessToken cookie
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.accessToken;

  if (token) {
    try {
      user = verifyAccessToken(token);
    } catch (err) {
      logger.debug({ err }, 'Invalid token in tRPC context');
    }
  }

  // Get the request ID from middleware
  const requestId = (req as any).requestId || 'unknown';

  let db: Db;

  try {
    db = getDb();
  } catch {
    throw new Error('Database not connected');
  }

  const redis = getRedis();

  return {
    req,
    res,
    db,
    redis,
    user,
    requestId,
  };
}

export interface Context {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  db: Db;
  redis: Redis | null;
  user: JwtPayload | null;
  requestId: string;
}

export type ContextType = inferAsyncReturnType<typeof createContext>;
