import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '../db/client';
import { createOutboxEvent } from './outbox.service';
import { getLogger } from '@repo/utils';
import { SolanaPaymentClient } from '@repo/payment';
import { ORDER_COLLECTION, type Order, type PaymentStatus } from '@repo/types';

const logger = getLogger('api:solana-payment-service');
const PAYMENT_INTENTS_COLLECTION = 'payment_intents';
const DEFAULT_MERCHANT_WALLET = process.env.SOLANA_MERCHANT_WALLET || '';

export interface PaymentIntentRecord {
  _id: string; orderId: string; userId: string; amount: number;
  currency: string; recipientAddress: string; signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date; updatedAt: Date;
}

export interface SolanaWebhookPayload { signature: string; orderId: string; }

export interface SolanaPaymentStatusResult {
  orderId: string; paymentStatus: PaymentStatus; signature: string | null; solanaStatus: string;
}

/**
 * Create a Solana payment intent for an order.
 */
export async function createSolanaPaymentIntent(
  orderId: string, userId: string, amount: number, recipientAddress?: string,
): Promise<PaymentIntentRecord> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);
  const paymentIntents = db.collection<PaymentIntentRecord>(PAYMENT_INTENTS_COLLECTION);

  const order = await orders.findOne({ _id: orderId, userId });
  if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: `Order "${orderId}" not found` });

  const targetAddress = recipientAddress || DEFAULT_MERCHANT_WALLET;
  if (!targetAddress) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No recipient Solana wallet configured' });

  const client = new SolanaPaymentClient();
  let txResult;
  try { txResult = await client.createPaymentTransaction(orderId, amount, targetAddress); }
  catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.error({ orderId, err: msg }, 'Solana payment tx failed');
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Solana payment failed: ${msg}` });
  }

  const now = new Date();
  const intent: PaymentIntentRecord = {
    _id: randomUUID(), orderId, userId, amount, currency: 'SOL',
    recipientAddress: targetAddress, signature: txResult.signature,
    status: 'pending', createdAt: now, updatedAt: now,
  };
  await paymentIntents.insertOne(intent);
  await createOutboxEvent('SolanaPaymentInitiated', orderId, {
    orderId, userId, amount, currency: 'SOL',
    signature: txResult.signature, recipientAddress: targetAddress,
    paymentIntentId: intent._id,
  });
  logger.info({ orderId, signature: txResult.signature }, 'Solana payment intent created');
  return intent;
}

/**
 * Process a Solana payment webhook notification.
 */
export async function processSolanaPaymentWebhook(payload: SolanaWebhookPayload): Promise<Order> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);
  const paymentIntents = db.collection<PaymentIntentRecord>(PAYMENT_INTENTS_COLLECTION);
  const { signature, orderId } = payload;

  const intent = await paymentIntents.findOne({ orderId, signature });
  if (!intent) throw new TRPCError({ code: 'NOT_FOUND', message: `No payment intent for ${orderId}` });

  const client = new SolanaPaymentClient();
  const verification = await client.verifyPayment(signature);
  const now = new Date();

  if (verification.confirmed) {
    const updated = await orders.findOneAndUpdate(
      { _id: orderId },
      { $set: { paymentStatus: 'paid' as PaymentStatus, updatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
    await paymentIntents.updateOne({ _id: intent._id }, { $set: { status: 'confirmed', updatedAt: now } });
    await createOutboxEvent('PaymentProcessed', orderId, {
      orderId, signature, slot: verification.slot, blockTime: verification.blockTime,
    });
    logger.info({ orderId, signature }, 'Solana payment confirmed');
    return updated;
  }

  const updated = await orders.findOneAndUpdate(
    { _id: orderId },
    { $set: { paymentStatus: 'failed' as PaymentStatus, updatedAt: now } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
  await paymentIntents.updateOne({ _id: intent._id }, { $set: { status: 'failed', updatedAt: now } });
  await createOutboxEvent('PaymentFailed', orderId, { orderId, signature, error: verification.err });
  logger.warn({ orderId, signature }, 'Solana payment failed');
  return updated;
}

/**
 * Get payment status for an order, checking on-chain if a signature exists.
 */
export async function getSolanaPaymentStatus(
  orderId: string, userId: string,
): Promise<SolanaPaymentStatusResult> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);
  const paymentIntents = db.collection<PaymentIntentRecord>(PAYMENT_INTENTS_COLLECTION);
  const order = await orders.findOne({ _id: orderId, userId });
  if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: `Order "${orderId}" not found` });
  const intent = await paymentIntents.findOne({ orderId }, { sort: { createdAt: -1 } });
  let solanaStatus = 'no_transaction';
  if (intent?.signature) {
    try { solanaStatus = await new SolanaPaymentClient().getPaymentStatus(intent.signature); }
    catch { solanaStatus = 'check_failed'; }
  }
  return { orderId, paymentStatus: order.paymentStatus, signature: intent?.signature ?? null, solanaStatus };
}
