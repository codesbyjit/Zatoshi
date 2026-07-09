import { z } from 'zod';

// ──────────────────────────────────────────
// Cart Item Schema (embedded in carts)
// ──────────────────────────────────────────

export const CartItemSchema = z.object({
  productId: z.string(),
  variantInfo: z.string().optional(),
  name: z.string().min(1).max(200),
  price: z.number().positive().multipleOf(0.01),
  image: z.string().url(),
  quantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

// ──────────────────────────────────────────
// Cart Schema — collection: carts
// ──────────────────────────────────────────

export const CartSchema = z.object({
  _id: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  items: z.array(CartItemSchema),
  updatedAt: z.date(),
});

export type Cart = z.infer<typeof CartSchema>;

export const CreateCartInputSchema = CartSchema.omit({
  _id: true,
  updatedAt: true,
});
export type CreateCartInput = z.infer<typeof CreateCartInputSchema>;

// ──────────────────────────────────────────
// MongoDB metadata
// ──────────────────────────────────────────

export const CART_COLLECTION = 'carts';

export const CART_INDEXES = [
  { key: { userId: 1 }, unique: true, sparse: true },
  { key: { sessionId: 1 }, unique: true, sparse: true },
] as const;

/**
 * TTL: expire carts 24 hours after last update.
 * Create with: `createIndex({ updatedAt: 1 }, { expireAfterSeconds: 86400 })`
 */
export const CART_TTL_SECONDS = 86400;
