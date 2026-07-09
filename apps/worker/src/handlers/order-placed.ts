import { getLogger } from '@repo/utils';
import type { OrderItem, ShippingAddress } from '@repo/types';
import { sendEmail, orderConfirmationEmail } from '../services/email.service';
import { decrementInventory } from '../services/inventory.service';
import { withRetry } from '../utils/retry';

const logger = getLogger('worker:handler:order-placed');

export interface OrderPlacedPayload {
  orderId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  orderNumber?: string;
  items: OrderItem[];
  total: number;
  shippingAddress: ShippingAddress;
}

/**
 * Handle an order.placed event.
 *
 * Responsibilities:
 * 1. Send order confirmation email to the user
 * 2. Decrement inventory for each item in the order
 *
 * Each step has its own error boundary so one failure doesn't block the other.
 *
 * @param payload - The order placed event payload
 */
export async function handleOrderPlaced(payload: OrderPlacedPayload): Promise<void> {
  const { orderId, userId, userEmail, userName, items, total, orderNumber } = payload;
  const displayOrderNumber = orderNumber || orderId;
  const displayName = userName || 'Valued Customer';

  logger.info(
    { orderId, itemCount: items.length, total },
    'Processing order.placed event',
  );

  const errors: string[] = [];

  // ── Step 1: Send confirmation email ──────────────────────────────────
  if (userEmail) {
    try {
      await withRetry(
        async () => {
          const { subject, body } = orderConfirmationEmail(
            displayName,
            displayOrderNumber,
            items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            total,
          );
          await sendEmail(userEmail, subject, body);
        },
        { maxRetries: 2, baseDelayMs: 500, label: 'order-confirmation-email' },
      );
      logger.info({ orderId, email: userEmail }, 'Order confirmation email sent');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ orderId, err }, 'Failed to send order confirmation email');
      errors.push(`email: ${message}`);
    }
  } else {
    logger.warn({ orderId, userId }, 'No user email available, skipping confirmation email');
  }

  // ── Step 2: Decrement inventory for each item ────────────────────────
  for (const item of items) {
    try {
      await withRetry(
        async () => {
          await decrementInventory(
            item.productId,
            item.variantInfo || null,
            item.quantity,
          );
        },
        {
          maxRetries: 2,
          baseDelayMs: 300,
          label: `decrement-inventory-${item.productId}`,
        },
      );
      logger.info(
        { orderId, productId: item.productId, quantity: item.quantity },
        'Inventory decremented',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { orderId, productId: item.productId, err },
        'Failed to decrement inventory',
      );
      errors.push(`inventory:${item.productId}: ${message}`);
    }
  }

  if (errors.length > 0) {
    logger.warn(
      { orderId, errors },
      `Order placed handler completed with ${errors.length} error(s)`,
    );
  } else {
    logger.info({ orderId }, 'Order placed handler completed successfully');
  }
}
