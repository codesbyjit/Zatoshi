import { getLogger } from '@repo/utils';
import { getDb } from '../db/client';

const logger = getLogger('worker:dlq');

const DLQ_COLLECTION = 'dead_letter_queue';

export interface FailedEvent {
  /** The original event type (e.g. "order.placed") */
  originalEventType: string;
  /** The original event payload */
  originalPayload: Record<string, unknown>;
  /** Error message that caused the failure */
  errorMessage: string;
  /** Number of retry attempts before failure */
  retryCount: number;
  /** Timestamp when the event failed */
  failedAt: Date;
}

/**
 * Writes a failed event to the Dead Letter Queue collection in MongoDB.
 * Events in the DLG require manual intervention to replay or discard.
 *
 * @param event - The failed event details
 */
export async function sendToDLQ(event: FailedEvent): Promise<void> {
  const db = getDb();

  logger.warn(
    {
      eventType: event.originalEventType,
      retryCount: event.retryCount,
      error: event.errorMessage,
    },
    'Sending event to Dead Letter Queue',
  );

  try {
    await db.collection(DLQ_COLLECTION).insertOne({
      ...event,
      createdAt: new Date(),
    });
    logger.info(
      { eventType: event.originalEventType },
      'Event written to Dead Letter Queue',
    );
  } catch (err) {
    // If we can't even write to the DLQ, log critically
    logger.fatal(
      { err, eventType: event.originalEventType },
      'CRITICAL: Failed to write to Dead Letter Queue',
    );
  }
}
