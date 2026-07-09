import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { config } from './config';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';
import { correlationMiddleware } from './middleware/correlation';
import { authMiddleware } from './middleware/auth';
import { apiRateLimiter, authRateLimiter } from './middleware/rate-limit';
import imagesRouter from './routers/images';
import { globalErrorHandler } from './middleware/error';
import { getDb } from './db/client';
import { getRedis } from './db/redis';
import {
  HealthCheck,
  ReadinessCheck,
  getLogger,
} from '@repo/utils';
import {
  metricsMiddleware,
  httpMetricsMiddleware,
} from '@repo/metrics';

const logger = getLogger('api:app');

/**
 * Create and configure the Express application.
 */
export async function createApp(): Promise<express.Application> {
  const app = express();

  // ── CORS ──────────────────────────────────────────────────
  const allowedOrigins = config.corsOrigins;
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (server-to-server, curl, health checks)
        if (!origin) return callback(null, true);
        // Allow if origin is in the configured list
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // In development, allow all localhost origins
        if (config.nodeEnv === 'development') {
          if (
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:')
          ) {
            return callback(null, true);
          }
        }
        logger.warn({ origin }, 'CORS request from unknown origin — allowing in development');
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'Idempotency-Key',
      ],
      exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    }),
  );

  // ── Body Parsing ──────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Cookie Parsing (for httpOnly JWT cookies) ────────────
  app.use(cookieParser());

  // ── Correlation ID ───────────────────────────────────────
  app.use(correlationMiddleware);

  // ── Prometheus Metrics ───────────────────────────────────
  app.use(httpMetricsMiddleware);
  app.use(metricsMiddleware);

  // ── JWT Auth (extract user if token present) ─────────────
  app.use(authMiddleware);

  // ── Image Upload & Serving ───────────────────────────────
  // Mount at root: upload is POST /api/v1/upload/..., serve is GET /images/...
  app.use(imagesRouter);

  // ── Health Checks ────────────────────────────────────────
  const healthCheck = new HealthCheck();
  const readinessCheck = new ReadinessCheck(healthCheck);

  healthCheck.register('mongodb', async () => {
    const db = getDb();
    await db.admin().ping();
  }, 3000);

  const redisForHealth = getRedis();
  if (redisForHealth) {
    healthCheck.register('redis', async () => {
      await redisForHealth.ping();
    }, 3000);
  }

  app.get('/health', async (_req, res) => {
    const status = await healthCheck.check();
    const httpStatus = status.status === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  app.get('/ready', async (_req, res) => {
    const status = await readinessCheck.check();
    const httpStatus = status.ready ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  // ── tRPC API ─────────────────────────────────────────────
  // Apply rate limiting to auth routes
  const authPath = '/trpc/auth.*';
  app.use(authPath, authRateLimiter);

  // General API rate limiting
  app.use('/trpc', apiRateLimiter);

  // tRPC middleware
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // ── 404 Handler ─────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        message: 'Not found',
        code: 'NOT_FOUND',
      },
    });
  });

  // ── Global Error Handler ────────────────────────────────
  app.use(globalErrorHandler);

  logger.info(
    { port: config.port, env: config.nodeEnv },
    'Express app configured',
  );

  return app;
}
