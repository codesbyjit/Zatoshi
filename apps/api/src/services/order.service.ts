import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';
import { createOutboxEvent } from './outbox.service';
import { getLogger } from '@repo/utils';
import {
  CART_COLLECTION,
  ORDER_COLLECTION,
  PRODUCT_COLLECTION,
  OUTBOX_COLLECTION,
  type Order,
  type OrderStatus,
  type OrderItem,
  type ShippingAddress,
  type Product,
} from '@repo/types';
import {
  incrementOrder,
  incrementRevenue,
  observeOrderProcessing,
} from '@repo/metrics';

const logger = getLogger('api:order-service');

/**
 * Convert a string ID to ObjectId if it matches MongoDB's 24-hex-char format.
 */
function toObjectId(id: string): ObjectId | string {
  if (/^[a-f0-9]{24}$/i.test(id)) {
    return new ObjectId(id);
  }
  return id;
}

/** Helper to build a Record filter match for `_id` that accepts both string and ObjectId. */
function idFilter(id: string): Record<string, unknown> {
  return { _id: toObjectId(id) };
}

// Simple sequential order number generator
let orderNumberSeq = Date.now();

function generateOrderNumber(): string {
  orderNumberSeq++;
  return `ORD-${String(orderNumberSeq).slice(-8)}`;
}

export interface CreateOrderInput {
  items: Array<{
    productId: string;
    variantInfo?: string;
    quantity: number;
  }>;
  shippingAddress: ShippingAddress;
  idempotencyKey?: string;
}

export interface OrderListFilters {
  status?: OrderStatus;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface OrderListResult {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create a new order with idempotency support.
 */
export async function createOrder(
  input: CreateOrderInput,
  userId: string,
): Promise<Order> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);
  const products = db.collection<Product>(PRODUCT_COLLECTION);

  const startTime = Date.now();

  // Check idempotency
  if (input.idempotencyKey) {
    const existing = await orders.findOne({
      idempotencyKey: input.idempotencyKey,
    });
    if (existing) {
      logger.info(
        { orderId: existing._id, idempotencyKey: input.idempotencyKey },
        'Duplicate order request — returning existing',
      );
      return existing;
    }
  }

  // Validate items and check inventory
  const orderItems: OrderItem[] = [];
  let subtotal = 0;

  for (const item of input.items) {
    const product = await products.findOne({
      ...idFilter(item.productId),
      isActive: true,
    });

    if (!product) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Product "${item.productId}" not found or inactive`,
      });
    }

    if (product.inventory < item.quantity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient inventory for "${product.name}". Available: ${product.inventory}, requested: ${item.quantity}`,
      });
    }

    const unitPrice = product.price;

    orderItems.push({
      productId: product._id,
      variantInfo: item.variantInfo,
      name: product.name,
      price: unitPrice,
      quantity: item.quantity,
      image: product.images[0] || '',
    });

    subtotal += unitPrice * item.quantity;
  }

  // Calculate totals
  const shippingCost = subtotal >= 100 ? 0 : 9.99;
  const taxRate = 0.08; // 8% tax
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;

  const now = new Date();
  const orderNumber = generateOrderNumber();

  const order: Omit<Order, 'idempotencyKey'> & { idempotencyKey?: string } = {
    _id: randomUUID(),
    orderNumber,
    userId,
    status: 'pending',
    items: orderItems,
    shippingAddress: input.shippingAddress,
    subtotal,
    shippingCost,
    tax,
    total,
    paymentStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  };

  // Use a session for the transaction (MongoDB replica set required)
  // For simplicity, we do sequential operations with a fallback
  try {
    await orders.insertOne(order);

    // Decrement inventory for each item
    for (const item of input.items) {
      await products.updateOne(
        { ...idFilter(item.productId), inventory: { $gte: item.quantity } },
        { $inc: { inventory: -item.quantity } },
      );
    }

    // Create outbox event for order.placed
    await createOutboxEvent('OrderPlaced', order._id, {
      orderId: order._id,
      orderNumber,
      userId,
      total,
      items: orderItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    // Track metrics
    incrementOrder('pending');
    incrementRevenue(Math.round(total * 100)); // in cents
    observeOrderProcessing((Date.now() - startTime) / 1000, 'pending');

    // Clear user's cart after successful order
    try {
      const carts = db.collection(CART_COLLECTION);
      await carts.updateOne(
        { userId },
        { $set: { items: [], updatedAt: new Date() } },
      );
    } catch (cartErr) {
      logger.warn({ err: cartErr }, 'Failed to clear cart after order — non-fatal');
    }

    logger.info(
      { orderId: order._id, orderNumber, userId },
      'Order created',
    );
  } catch (err) {
    logger.error({ err }, 'Order creation failed');
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create order',
    });
  }

  return order;
}

/**
 * Get an order by ID with ownership check.
 */
export async function getOrderById(
  orderId: string,
  userId: string,
  isAdmin: boolean = false,
): Promise<Order | null> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);

  const query: Record<string, unknown> = { _id: orderId };
  if (!isAdmin) {
    query.userId = userId;
  }

  const order = await orders.findOne(query);
  return order;
}

/**
 * List orders for the current user.
 */
export async function listMyOrders(
  userId: string,
  filters: OrderListFilters,
): Promise<OrderListResult> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);

  const query: Record<string, unknown> = { userId };
  if (filters.status) {
    query.status = filters.status;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    orders.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    orders.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * List all orders (admin only) with optional filters.
 */
export async function adminListOrders(
  filters: OrderListFilters,
): Promise<OrderListResult> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);

  const query: Record<string, unknown> = {};
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.userId) {
    query.userId = filters.userId;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    orders.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    orders.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update an order's status (admin only). Creates an outbox event.
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const db = getDb();
  const orders = db.collection<Order>(ORDER_COLLECTION);

  const result = await orders.findOneAndUpdate(
    { _id: orderId },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Order not found',
    });
  }

  // Create outbox event for status change
  await createOutboxEvent('OrderStatusChanged', orderId, {
    orderId,
    previousStatus: result.status,
    newStatus: status,
  });

  // Track metric
  incrementOrder(status);

  logger.info({ orderId, status }, 'Order status updated');

  return result;
}
