import { getLogger } from '@repo/utils';
import { ORDER_COLLECTION } from '@repo/types';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';

const logger = getLogger('worker:order');

/**
 * Update the status of an order.
 *
 * @param orderId - The order ID
 * @param status - The new status value
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<void> {
  const db = getDb();
  const collection = db.collection(ORDER_COLLECTION);

  const result = await collection.updateOne(
    { _id: new ObjectId(orderId) },
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new Error(`Order not found: ${orderId}`);
  }

  logger.info({ orderId, status }, 'Order status updated');
}

/**
 * Update the payment status of an order.
 *
 * @param orderId - The order ID
 * @param paymentStatus - The new payment status value
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string,
): Promise<void> {
  const db = getDb();
  const collection = db.collection(ORDER_COLLECTION);

  const result = await collection.updateOne(
    { _id: new ObjectId(orderId) },
    {
      $set: {
        paymentStatus,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new Error(`Order not found: ${orderId}`);
  }

  logger.info({ orderId, paymentStatus }, 'Payment status updated');
}
