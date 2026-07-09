import express from 'express';
import { getLogger } from '@repo/utils';
import { HealthCheck, ReadinessCheck } from '@repo/utils';
import { metricsMiddleware, httpMetricsMiddleware } from '@repo/metrics';
import { config } from './config';
import { connectDatabase, disconnectDatabase, getClient } from './db/client';
import { connectRedis, disconnectRedis, ensureStreamAndGroup, getRedis } from './db/redis';
import { startOutboxConsumer, stopOutboxConsumer } from './consumers/outbox-consumer';
import { startOrderConsumer, stopOrderConsumer } from './consumers/order-consumer';
import { startPaymentConsumer, stopPaymentConsumer } from './consumers/payment-consumer';
import { startUserConsumer, stopUserConsumer } from './consumers/user-consumer';

const logger = getLogger('worker');

// ──────────────────────────────────────────
// Health checks
// ──────────────────────────────────────────

const healthCheck = new HealthCheck();
const readinessCheck = new ReadinessCheck(healthCheck);

// ──────────────────────────────────────────
// Express server (health, readiness, metrics)
// ──────────────────────────────────────────

function createHealthServer() {
  const app = express();

  // Prometheus metrics
  app.use(metricsMiddleware);
  app.use(httpMetricsMiddleware);

  // Liveness probe
  app.get('/health', async (_req, res) => {
    const status = await healthCheck.check();
    const httpStatus = status.status === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  // Readiness probe
  app.get('/ready', async (_req, res) => {
    const status = await readinessCheck.check();
    const httpStatus = status.ready ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  return app;
}

// ──────────────────────────────────────────
// Graceful shutdown
// ──────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  // Stop consumers
  stopOutboxConsumer();
  stopOrderConsumer();
  stopPaymentConsumer();
  stopUserConsumer();

  // Give consumers a moment to finish processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Disconnect infrastructure
  await disconnectRedis();
  await disconnectDatabase();

  logger.info('Worker shutdown complete');
  process.exit(0);
}

// ──────────────────────────────────────────
// Main
// ──────────────────────────────────────────

async function main(): Promise<void> {
  logger.info({ version: '0.1.0' }, 'Starting worker service...');

  // ── Connect to infrastructure ──────────────────────────────────────
  logger.info('Connecting to MongoDB...');
  const { client: mongoClient, db: mongoDb } = await connectDatabase();

  // Register MongoDB health check
  healthCheck.register('mongodb', async () => {
    await mongoDb.admin().ping();
  });

  logger.info('Connecting to Redis...');
  const redisClient = await connectRedis();

  if (redisClient) {
    // Register Redis health check
    healthCheck.register('redis', async () => {
      await redisClient.ping();
    });

    // Ensure the Redis stream and consumer group exist
    await ensureStreamAndGroup();

    // ── Start consumers ──────────────────────────────────────────────
    startOutboxConsumer();
    startOrderConsumer();
    startPaymentConsumer();
    startUserConsumer();
  } else {
    logger.warn('Redis unavailable — consumers not started. Only health checks available.');
  }

  // ── Start health server ────────────────────────────────────────────
  const app = createHealthServer();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Health server listening');
  });

  logger.info('Worker service started successfully');

  // ── Register shutdown handlers ─────────────────────────────────────
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start worker service');
  process.exit(1);
});
