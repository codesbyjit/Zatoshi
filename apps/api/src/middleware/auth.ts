import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../utils/jwt';
import { verifyAccessToken } from '../utils/jwt';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:auth-middleware');

/**
 * Express middleware that extracts and verifies a JWT from the
 * `Authorization: Bearer <token>` header or the `accessToken` httpOnly cookie.
 *
 * On success, attaches `req.user` with `{ userId, role }`.
 * On failure, does NOT block — downstream middleware/routes decide auth.
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Prefer Authorization header, fall back to httpOnly accessToken cookie
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

/**
 * Extract the authenticated user from the request.
 * Returns null if not authenticated.
 */
export function getAuthUser(req: Request): JwtPayload | null {
  return (req as any).user || null;
}
