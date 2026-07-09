import { randomUUID } from 'node:crypto';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  OUTBOX_COLLECTION,
  type Outbox,
} from '@repo/types';

const logger = getLogger('api:outbox-service');

/**
 * Create an outbox event for the outbox pattern.
 * Worker polls for "pending" events and publishes to Redis Streams.
 */
export async function createOutboxEvent(
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
): Promise<Outbox> {
  const db = getDb();
  const outbox = db.collection<Outbox>(OUTBOX_COLLECTION);

  const now = new Date();
  const event: Outbox = {
    _id: randomUUID(),
    eventType,
    eventId: randomUUID(),
    aggregateId,
    payload,
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    createdAt: now,
  };

  await outbox.insertOne(event);

  logger.info(
    {
      eventId: event.eventId,
      eventType,
      aggregateId,
    },
    'Outbox event created',
  );

  return event;
}
