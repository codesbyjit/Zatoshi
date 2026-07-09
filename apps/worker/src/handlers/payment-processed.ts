import { getLogger } from '@repo/utils';
import { v4 as uuidv4 } from 'uuid';
import { updatePaymentStatus, updateOrderStatus } from '../services/order.service';
import { getDb } from '../db/client';
import { OUTBOX_COLLECTION } from '@repo/types';
import { withRetry } from '../utils/retry';

const logger = getLogger('worker:handler:payment-processed');

export interface PaymentProcessedPayload {
  orderId: string;
  status: 'paid' | 'failed' | 'refunded';
  transactionId?: string;
  amount?: number;
  currency?: string;
}

/**
 * Handle a payment.processed event.
 *
 * Responsibilities:
 * 1. Update the order's payment status
 * 2. If paid, update order status to "confirmed"
 * 3. If paid, emit an inventory.updated outbox event for the next step
 * 4. If failed, update order status to "cancelled"
 *
 * @param payload - The payment processed event payload
 */
export async function handlePaymentProcessed(
  payload: PaymentProcessedPayload,
): Promise<void> {
  const { orderId, status, transactionId, amount, currency } = payload;

  logger.info(
    { orderId, status, transactionId },
    'Processing payment.processed event',
  );

  // ── Step 1: Update payment status on the order ───────────────────────
  await withRetry(
    async () => {
      await updatePaymentStatus(orderId, status);
    },
    { maxRetries: 2, baseDelayMs: 300, label: `update-payment-status-${orderId}` },
  );
  logger.info({ orderId, paymentStatus: status }, 'Payment status updated on order');

  if (status === 'paid') {
    // ── Step 2: Update order status to "confirmed" ─────────────────────
    await withRetry(
      async () => {
        await updateOrderStatus(orderId, 'confirmed');
      },
      { maxRetries: 2, baseDelayMs: 300, label: `update-order-status-${orderId}` },
    );
    logger.info({ orderId }, 'Order status updated to confirmed');

    // ── Step 3: Emit inventory.updated outbox event ────────────────────
    // This will be picked up by the outbox consumer and published to the
    // Redis stream, where it can trigger inventory reservation finalization.
    await withRetry(
      async () => {
        await emitInventoryUpdatedEvent(orderId, amount, currency);
      },
      {
        maxRetries: 2,
        baseDelayMs: 500,
        label: `emit-inventory-updated-${orderId}`,
      },
    );
    logger.info({ orderId }, 'inventory.updated outbox event created');
  } else if (status === 'failed') {
    // ── Step 4: On failure, cancel the order ───────────────────────────
    await withRetry(
      async () => {
        await updateOrderStatus(orderId, 'cancelled');
      },
      { maxRetries: 2, baseDelayMs: 300, label: `cancel-order-${orderId}` },
    );
    logger.info({ orderId }, 'Order cancelled due to payment failure');
  }

  logger.info({ orderId, status }, 'Payment processed handler completed');
}

/**
 * Create an outbox event for inventory.updated so the next step
 * in the pipeline can proceed (e.g., finalize inventory reservation).
 */
async function emitInventoryUpdatedEvent(
  orderId: string,
  amount?: number,
  currency?: string,
): Promise<void> {
  const db = getDb();

  await db.collection(OUTBOX_COLLECTION).insertOne({
    eventType: 'inventory.updated',
    eventId: uuidv4(),
    aggregateId: orderId,
    payload: {
      orderId,
      amount,
      currency: currency || 'USD',
    },
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
  });
}
