import { config } from './config';
import { connectMongo } from './db/client';
import { connectRedis } from './db/redis';
import { createApp } from './app';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:server');

async function main(): Promise<void> {
  logger.info('Starting API server...');

  // Connect to MongoDB
  try {
    await connectMongo();
    logger.info('MongoDB connected');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to MongoDB');
    process.exit(1);
  }

  // Connect to Redis (optional — degraded mode without it)
  const redisConnected = await connectRedis();
  if (redisConnected) {
    logger.info('Redis connected');
  } else {
    logger.warn('Redis unavailable — running in degraded mode (no caching, rate limiting, or pub/sub)');
  }

  // Create and start the Express app
  const app = await createApp();

  app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv },
      `API server listening on port ${config.port}`,
    );
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Unhandled error during startup');
  process.exit(1);
});
