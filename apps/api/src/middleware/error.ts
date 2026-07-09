import type { Request, Response, NextFunction } from 'express';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:error');

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/**
 * Global Express error handler that catches all thrown errors,
 * formats as JSON, and logs with pino.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as any).requestId || 'unknown';

  // Determine status code and error code
  const statusCode = (err as any).statusCode || (err as any).status || 500;
  const errorCode = (err as any).code || 'INTERNAL_ERROR';

  // Log the error
  logger.error(
    {
      err,
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
    },
    'Request failed',
  );

  // Don't leak internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  const body: ApiErrorResponse = {
    error: {
      message,
      code: errorCode,
    },
  };

  // In dev mode, include stack trace and full error details
  if (!isProduction) {
    body.error.details = {
      stack: err.stack,
    };
  }

  res.status(statusCode).json(body);
}
