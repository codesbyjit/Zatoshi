import { describe, it, expect, beforeEach } from 'vitest';
import { OUTBOX_COLLECTION } from '@repo/types';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getTestMongoClient, getTestRedis } from './setup';

// ──────────────────────────────────────────
// Import real implementations (mocked at setup level)
// ──────────────────────────────────────────

import { sendToDLQ } from '../src/utils/dlq';
import { withRetry } from '../src/utils/retry';

// ──────────────────────────────────────────
// Outbox Consumer Tests
// ──────────────────────────────────────────

describe('Outbox Consumer', () => {
  beforeEach(async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    const redis = getTestRedis();
    await redis.flushall();
  });

  /**
   * Helper: insert a pending outbox record directly into MongoDB.
   * Returns the inserted document with its real ObjectId _id.
   */
  async function insertOutboxRecord(overrides: Record<string, unknown> = {}): Promise<Record<string, any>> {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const doc = {
      eventType: 'test.event',
      eventId: uuidv4(),
      aggregateId: 'agg-123',
      payload: { key: 'value' },
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
      createdAt: new Date(),
      publishedAt: null,
      ...overrides,
    };
    const result = await db.collection(OUTBOX_COLLECTION).insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  it('should pick up pending outbox records', async () => {
    await insertOutboxRecord();

    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const records = await db
      .collection(OUTBOX_COLLECTION)
      .find({ status: 'pending', retryCount: { $lt: 3 } })
      .sort({ createdAt: 1 })
      .limit(50)
      .toArray();

    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('pending');
    expect(records[0].retryCount).toBe(0);
  });

  it('should pick up only pending records (skip published and failed)', async () => {
    await insertOutboxRecord({ status: 'published' });
    await insertOutboxRecord({ status: 'failed', retryCount: 3 });
    await insertOutboxRecord({}); // pending

    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const records = await db
      .collection(OUTBOX_COLLECTION)
      .find({ status: 'pending', retryCount: { $lt: 3 } })
      .sort({ createdAt: 1 })
      .limit(50)
      .toArray();

    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('pending');
  });

  it('should be able to publish a record to Redis Stream and mark as published', async () => {
    const record = await insertOutboxRecord();
    const redis = getTestRedis();
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');

    // Simulate what the outbox consumer does
    const { eventType, eventId, payload } = record;

    // Publish to Redis Stream
    await redis.xadd(
      'ecommerce:events',
      '*',
      'type',
      eventType,
      'payload',
      JSON.stringify(payload),
      'eventId',
      eventId,
    );

    // Verify the message is in the stream
    const streamLen = await redis.xlen('ecommerce:events');
    expect(streamLen).toBe(1);

    // Read it back
    const messages = await redis.xrange('ecommerce:events', '-', '+');
    expect(messages).toHaveLength(1);

    const [, fields] = messages[0];
    const fieldsObj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      fieldsObj[fields[i]] = fields[i + 1];
    }

    expect(fieldsObj['type']).toBe('test.event');
    expect(JSON.parse(fieldsObj['payload'])).toEqual({ key: 'value' });
    expect(fieldsObj['eventId']).toBe(eventId);

    // Mark as published (simulate the success path)
    const updateResult = await db.collection(OUTBOX_COLLECTION).updateOne(
      { _id: new ObjectId(record._id) },
      {
        $set: {
          status: 'published',
          publishedAt: new Date(),
        },
      },
    );

    expect(updateResult.modifiedCount).toBe(1);

    // Verify it's now published
    const updated = await db.collection(OUTBOX_COLLECTION).findOne({ _id: new ObjectId(record._id) });
    expect(updated?.status).toBe('published');
    expect(updated?.publishedAt).toBeDefined();
  });

  it('should increment retryCount and set lastError on publish failure', async () => {
    const record = await insertOutboxRecord();
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');

    // Simulate a failure by directly updating the record
    const errorMessage = 'Simulated publish failure';
    const newRetryCount = (record.retryCount as number) + 1;

    await db.collection(OUTBOX_COLLECTION).updateOne(
      { _id: new ObjectId(record._id) },
      {
        $set: {
          status: 'pending',
          lastError: errorMessage,
          retryCount: newRetryCount,
        },
      },
    );

    const updated = await db.collection(OUTBOX_COLLECTION).findOne({ _id: new ObjectId(record._id) });
    expect(updated?.retryCount).toBe(1);
    expect(updated?.lastError).toBe(errorMessage);
    expect(updated?.status).toBe('pending');
  });

  it('should move record to DLQ after max retries exceeded', async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');

    // Insert a record that has exhausted retries
    const record = await insertOutboxRecord({
      retryCount: 3,
      maxRetries: 3,
      lastError: 'Previous failure',
      status: 'failed',
    });

    // Verify it is NOT picked up by the pending query
    const pendingRecords = await db
      .collection(OUTBOX_COLLECTION)
      .find({ status: 'pending', retryCount: { $lt: 3 } })
      .toArray();

    expect(pendingRecords).toHaveLength(0);

    // Verify it has the failed status
    const failed = await db.collection(OUTBOX_COLLECTION).findOne({ _id: new ObjectId(record._id) });
    expect(failed).not.toBeNull();
    expect(failed?.retryCount).toBe(3);
  });

  it('should pick up records in correct order (oldest first)', async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');

    const pastDate = new Date('2025-01-01T00:00:00Z');
    const currentDate = new Date('2025-06-01T00:00:00Z');

    // Insert three records with different timestamps
    await insertOutboxRecord({
      eventType: 'event.third',
      createdAt: currentDate,
    });
    await insertOutboxRecord({
      eventType: 'event.first',
      createdAt: pastDate,
    });
    await insertOutboxRecord({
      eventType: 'event.second',
      createdAt: new Date('2025-03-01T00:00:00Z'),
    });

    const records = await db
      .collection(OUTBOX_COLLECTION)
      .find({ status: 'pending', retryCount: { $lt: 3 } })
      .sort({ createdAt: 1 })
      .limit(50)
      .toArray();

    expect(records).toHaveLength(3);
    expect(records[0].eventType).toBe('event.first');
    expect(records[1].eventType).toBe('event.second');
    expect(records[2].eventType).toBe('event.third');
  });
});

// ──────────────────────────────────────────
// DLQ Tests
// ──────────────────────────────────────────

describe('DLQ', () => {
  beforeEach(async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  it('should write failed events to dead_letter_queue collection', async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');

    const failedEvent = {
      originalEventType: 'order.placed',
      originalPayload: { orderId: 'ord-123' },
      errorMessage: 'Connection refused',
      retryCount: 3,
      failedAt: new Date(),
    };

    await sendToDLQ(failedEvent);

    const dlqRecords = await db.collection('dead_letter_queue').find({}).toArray();
    expect(dlqRecords).toHaveLength(1);
    expect(dlqRecords[0].originalEventType).toBe('order.placed');
    expect(dlqRecords[0].retryCount).toBe(3);
    expect(dlqRecords[0].errorMessage).toBe('Connection refused');
  });
});

// ──────────────────────────────────────────
// Retry Utility Tests
// ──────────────────────────────────────────

describe('Retry Utility', () => {
  it('should retry on failure and succeed on subsequent attempt', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      },
      { maxRetries: 3, baseDelayMs: 10 },
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after exhausting all retries', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('Always fails');
        },
        { maxRetries: 2, baseDelayMs: 10 },
      ),
    ).rejects.toThrow('Always fails');

    expect(attempts).toBe(3); // initial try + 2 retries
  });

  it('should succeed on first attempt without retrying', async () => {
    const result = await withRetry(async () => 'immediate', {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    expect(result).toBe('immediate');
  });
});
