import { z } from 'zod';

// ──────────────────────────────────────────
// Order Item Schema (embedded in orders)
// ──────────────────────────────────────────

export const OrderItemSchema = z.object({
  productId: z.string(),
  variantInfo: z.string().optional(),
  name: z.string().min(1).max(200),
  price: z.number().positive().multipleOf(0.01),
  quantity: z.number().int().positive(),
  image: z.string().url(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

// ──────────────────────────────────────────
// Shipping Address Schema (embedded in orders)
// ──────────────────────────────────────────

export const ShippingAddressSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// ──────────────────────────────────────────
// Order Schema — collection: orders
// ──────────────────────────────────────────

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentStatusSchema = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const OrderSchema = z.object({
  _id: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema).min(1),
  shippingAddress: ShippingAddressSchema,
  subtotal: z.number().positive().multipleOf(0.01),
  shippingCost: z.number().min(0).multipleOf(0.01),
  tax: z.number().min(0).multipleOf(0.01),
  total: z.number().positive().multipleOf(0.01),
  paymentStatus: PaymentStatusSchema,
  idempotencyKey: z.string().optional(),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderInputSchema = OrderSchema.omit({
  _id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

// ──────────────────────────────────────────
// MongoDB metadata
// ──────────────────────────────────────────

export const ORDER_COLLECTION = 'orders';

export const ORDER_INDEXES = [
  { key: { orderNumber: 1 }, unique: true },
  { key: { userId: 1 } },
  { key: { status: 1 } },
  { key: { createdAt: -1 } },
  { key: { idempotencyKey: 1 }, unique: true, sparse: true },
] as const;
