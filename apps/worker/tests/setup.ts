import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import RedisMock from 'ioredis-mock';
import { beforeAll, afterAll, vi } from 'vitest';

// ──────────────────────────────────────────
// Test Setup — use vi.hoisted for vars needed by hoisted vi.mock factories
// ──────────────────────────────────────────

const testVars = vi.hoisted(() => {
  let mongod: MongoMemoryServer | undefined;
  let mongoClient: MongoClient | undefined;
  let redisMock: RedisMock | undefined;
  let mongoUri = 'mongodb://localhost:27017';
  const dbName = 'ecommerce_test';

  return {
    setMongod: (m: MongoMemoryServer) => { mongod = m; },
    setMongoClient: (c: MongoClient) => { mongoClient = c; },
    setRedisMock: (r: RedisMock) => { redisMock = r; },
    setMongoUri: (u: string) => { mongoUri = u; },
    getMongoUri: () => mongoUri,
    getMongoClient: () => mongoClient!,
    getRedisMock: () => redisMock!,
    getDbName: () => dbName,
  };
});

/**
 * Get the test MongoDB URI.
 */
export function getTestMongoUri(): string {
  return testVars.getMongoUri();
}

/**
 * Get the test MongoDB database name.
 */
export function getTestDbName(): string {
  return testVars.getDbName();
}

/**
 * Get a mock Redis client for testing.
 */
export function getTestRedis(): RedisMock {
  return testVars.getRedisMock();
}

/**
 * Get the MongoClient for testing.
 */
export function getTestMongoClient(): MongoClient {
  return testVars.getMongoClient();
}

// ──────────────────────────────────────────
// Hoisted mocks (these run before imports in test files)
// ──────────────────────────────────────────

vi.mock('../src/config', () => ({
  config: {
    port: 0,
    mongodbUri: testVars.getMongoUri(),
    redisUrl: 'redis://localhost:6379',
    nodeEnv: 'test',
    pollIntervalMs: 100,
    maxRetries: 3,
    outboxBatchSize: 50,
    redisStream: 'ecommerce:events',
    redisConsumerGroup: 'ecommerce:worker-group',
    redisConsumerName: 'test-worker',
    redisBlockMs: 1000,
    dbName: testVars.getDbName(),
  },
}));

vi.mock('../src/db/client', () => ({
  connectDatabase: async () => {
    const db = testVars.getMongoClient().db(testVars.getDbName());
    return { client: testVars.getMongoClient(), db };
  },
  getDb: () => testVars.getMongoClient().db(testVars.getDbName()),
  getClient: () => testVars.getMongoClient(),
  disconnectDatabase: async () => {},
}));

vi.mock('../src/db/redis', () => ({
  connectRedis: async () => testVars.getRedisMock(),
  getRedis: () => testVars.getRedisMock(),
  disconnectRedis: async () => {},
  ensureStreamAndGroup: async () => {},
}));

// ──────────────────────────────────────────
// Vitest hooks (not hoisted — runs before/after tests)
// ──────────────────────────────────────────

beforeAll(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const redisMock = new RedisMock();

  testVars.setMongod(mongod);
  testVars.setMongoClient(client);
  testVars.setRedisMock(redisMock);
  testVars.setMongoUri(uri);
});

afterAll(async () => {
  const client = testVars.getMongoClient();
  const redisMock = testVars.getRedisMock();
  if (client) {
    await client.close();
  }
  if (redisMock) {
    redisMock.disconnect();
  }
});
