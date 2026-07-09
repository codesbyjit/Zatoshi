// ──────────────────────────────────────────
// Worker Service — Environment Configuration
// ──────────────────────────────────────────

export const config = {
  /** HTTP port for health/metrics server */
  port: parseInt(process.env.PORT || '3002', 10),

  /** MongoDB connection string */
  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/ecommerce?replicaSet=rs0&directConnection=true',

  /** Redis connection string */
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  /** Runtime environment */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** How often (in ms) the outbox consumer polls MongoDB */
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),

  /** Max retry attempts for outbox events before they go to DLQ */
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '3', 10),

  /** How many outbox records to fetch per poll cycle */
  outboxBatchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),

  /** Redis stream name */
  redisStream: process.env.REDIS_STREAM || 'ecommerce:events',

  /** Redis consumer group name */
  redisConsumerGroup: process.env.REDIS_CONSUMER_GROUP || 'ecommerce:worker-group',

  /** Consumer name (unique per instance) */
  redisConsumerName:
    process.env.REDIS_CONSUMER_NAME || `worker-${process.pid}`,

  /** How long to block when reading from Redis stream (ms) */
  redisBlockMs: parseInt(process.env.REDIS_BLOCK_MS || '5000', 10),

  /** Database name */
  dbName: process.env.DB_NAME || 'ecommerce',
} as const;

export type Config = typeof config;
