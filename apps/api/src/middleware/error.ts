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

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as any).requestId || 'unknown';

  const statusCode = (err as any).statusCode || (err as any).status || 500;
  const errorCode = (err as any).code || 'INTERNAL_ERROR';

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

  if (!isProduction) {
    body.error.details = {
      stack: err.stack,
    };
  }

  res.status(statusCode).json(body);
}
