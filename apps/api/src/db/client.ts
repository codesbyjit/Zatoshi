import { MongoClient, type Db } from 'mongodb';

import { config } from '../config';
import { getLogger } from '@repo/utils';
import {
  USER_COLLECTION,
  USER_INDEXES,
  PRODUCT_COLLECTION,
  PRODUCT_INDEXES,
  CATEGORY_COLLECTION,
  CATEGORY_INDEXES,
  ORDER_COLLECTION,
  ORDER_INDEXES,
  CART_COLLECTION,
  CART_INDEXES,
  OUTBOX_COLLECTION,
  OUTBOX_INDEXES,
  PRODUCT_ANALYTICS_COLLECTION,
  PRODUCT_ANALYTICS_INDEXES,
  USER_ACTIVITY_COLLECTION,
  USER_ACTIVITY_INDEXES,
  REVIEWS_COLLECTION,
  REVIEWS_INDEXES,
  RECOMMENDATION_CACHE_COLLECTION,
  RECOMMENDATION_CACHE_INDEXES,
  PRODUCT_ANALYTICS_VALIDATOR,
  REVIEWS_VALIDATOR,
  RECOMMENDATION_CACHE_VALIDATOR,
} from '@repo/types';

const logger = getLogger('api:db');

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;

  logger.info({ uri: sanitizeUri(config.mongodbUri) }, 'Connecting to MongoDB');

  client = new MongoClient(config.mongodbUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  db = client.db();

  await ensureIndexes(db);

  logger.info('MongoDB connected and indexes ensured');
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongo() first.');
  }
  return db;
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}

async function ensureIndexes(database: Db): Promise<void> {
  const collections = await database.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  const indexConfigs: Array<{
    name: string;
    indexes: ReadonlyArray<{
      key: Record<string, unknown>;
      unique?: boolean;
      sparse?: boolean;
      weights?: Record<string, number>;
      expireAfterSeconds?: number;
    }>;
    validator?: Record<string, unknown>;
  }> = [
    { name: USER_COLLECTION, indexes: USER_INDEXES as any },
    { name: PRODUCT_COLLECTION, indexes: PRODUCT_INDEXES as any },
    { name: CATEGORY_COLLECTION, indexes: CATEGORY_INDEXES as any },
    { name: ORDER_COLLECTION, indexes: ORDER_INDEXES as any },
    { name: CART_COLLECTION, indexes: CART_INDEXES as any },
    { name: OUTBOX_COLLECTION, indexes: OUTBOX_INDEXES as any },
    {
      name: PRODUCT_ANALYTICS_COLLECTION,
      indexes: PRODUCT_ANALYTICS_INDEXES as any,
      validator: PRODUCT_ANALYTICS_VALIDATOR,
    },
    {
      name: USER_ACTIVITY_COLLECTION,
      indexes: USER_ACTIVITY_INDEXES as any,
    },
    {
      name: REVIEWS_COLLECTION,
      indexes: REVIEWS_INDEXES as any,
      validator: REVIEWS_VALIDATOR,
    },
    {
      name: RECOMMENDATION_CACHE_COLLECTION,
      indexes: RECOMMENDATION_CACHE_INDEXES as any,
      validator: RECOMMENDATION_CACHE_VALIDATOR,
    },
  ];

  for (const { name, indexes, validator } of indexConfigs) {
    // Create collection if it doesn't exist with optional validation
    if (!collectionNames.includes(name)) {
      const options: Record<string, unknown> = {};
      if (validator) {
        options.validator = validator;
      }
      await database.createCollection(name, options);
    }
    const col = database.collection(name);

    for (const idx of indexes) {
      try {
        const options: Record<string, unknown> = {};
        if (idx.unique) options.unique = true;
        if (idx.sparse) options.sparse = true;
        if (idx.weights) options.weights = idx.weights;
        if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
        await col.createIndex(idx.key as any, options);
      } catch (err) {
        logger.warn({ err, collection: name, index: idx.key }, 'Failed to create index');
      }
    }
  }
}

function sanitizeUri(uri: string): string {
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return uri;
  }
}

export function isMongoConnected(): boolean {
  if (!client) return false;
  try {
    // Attempt to ping the admin database
    return true;
  } catch {
    return false;
  }
}
