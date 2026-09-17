import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../utils/jwt';
import { verifyAccessToken } from '../utils/jwt';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:auth-middleware');

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.accessToken;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload;
  } catch (err) {
    logger.debug({ err }, 'Invalid access token');
  }

  next();
}

export function getAuthUser(req: Request): JwtPayload | null {
  return (req as any).user || null;
}
