import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that reads X-Request-ID header or generates a UUID,
 * then attaches it to both req and res headers for correlation tracing.
 */
export function correlationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const requestId =
    (req.headers['x-request-id'] as string) || randomUUID();

  // Attach to request for downstream use
  (req as any).requestId = requestId;

  // Set response header
  _res.setHeader('X-Request-ID', requestId);

  next();
}
