import { MongoClient, type Db } from 'mongodb';
import { getLogger } from '@repo/utils';
import { config } from '../config';

const logger = getLogger('worker:db');

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB and return the client and database instances.
 * Reuses an existing connection if one is already established.
 */
export async function connectDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (client && db) {
    return { client, db };
  }

  logger.info('Connecting to MongoDB...');
  const mongoClient = new MongoClient(config.mongodbUri, {
    appName: 'worker',
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  });

  await mongoClient.connect();
  logger.info('MongoDB connected successfully');

  client = mongoClient;
  db = mongoClient.db(config.dbName);

  return { client, db };
}

/**
 * Get the current database instance. Throws if not yet connected.
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
}

/**
 * Get the current MongoClient instance. Throws if not yet connected.
 */
export function getClient(): MongoClient {
  if (!client) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return client;
}

/**
 * Gracefully close the MongoDB connection.
 */
export async function disconnectDatabase(): Promise<void> {
  if (client) {
    logger.info('Disconnecting from MongoDB...');
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}
