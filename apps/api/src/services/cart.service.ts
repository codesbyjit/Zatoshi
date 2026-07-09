import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  CART_COLLECTION,
  CART_TTL_SECONDS,
  PRODUCT_COLLECTION,
  type Cart,
  type CartItem,
  type Product,
} from '@repo/types';

const logger = getLogger('api:cart-service');

const CART_TTL_MS = CART_TTL_SECONDS * 1000;

/**
 * Convert a string ID to ObjectId if it matches MongoDB's 24-hex-char format.
 * This supports both ObjectId-based and UUID-based product IDs.
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

/**
 * Get the current cart for a user or session.
 */
export async function getCart(
  userId?: string,
  sessionId?: string,
): Promise<Cart> {
  const db = getDb();
  const carts = db.collection<Cart>(CART_COLLECTION);

  let query: Record<string, unknown> = {};
  if (userId) {
    query = { userId };
  } else if (sessionId) {
    query = { sessionId };
  } else {
    // Return empty cart
    return {
      _id: randomUUID(),
      items: [],
      updatedAt: new Date(),
    };
  }

  const cart = await carts.findOne(query);
  if (!cart) {
    // Create empty cart
    const now = new Date();
    const newCart: Cart = {
      _id: randomUUID(),
      userId,
      ...(sessionId && !userId ? { sessionId } : {}),
      items: [],
      updatedAt: now,
    };
    await carts.insertOne(newCart);
    return newCart;
  }

  return cart;
}

/**
 * Add an item to the cart (upsert — merge if product already exists).
 */
export async function addCartItem(
  cartId: string,
  item: {
    productId: string;
    variantInfo?: string;
    quantity: number;
  },
): Promise<Cart> {
  const db = getDb();
  const carts = db.collection<Cart>(CART_COLLECTION);

  // Fetch product to get current price and details
  const product = await db
    .collection<Product>(PRODUCT_COLLECTION)
    .findOne({ ...idFilter(item.productId), isActive: true });

  if (!product) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Product not found or inactive',
    });
  }

  if (product.inventory < item.quantity) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient inventory for "${product.name}". Available: ${product.inventory}`,
    });
  }

  const cartItem: CartItem = {
    productId: product._id,
    variantInfo: item.variantInfo,
    name: product.name,
    price: product.price,
    image: product.images[0] || '',
    quantity: item.quantity,
  };

  // Check if the item already exists in cart (same productId + same variantInfo)
  const existingItem = await carts.findOne({
    _id: cartId,
    items: {
      $elemMatch: {
        productId: toObjectId(item.productId),
        variantInfo: item.variantInfo || { $exists: false },
      },
    },
  });

  if (existingItem) {
    // Item exists — update quantity
    await carts.updateOne(
      {
        _id: cartId,
        'items.productId': toObjectId(item.productId),
        'items.variantInfo': item.variantInfo || { $exists: false },
      },
      {
        $inc: { 'items.$.quantity': item.quantity },
        $set: {
          'items.$.price': product.price,
          'items.$.name': product.name,
          'items.$.image': product.images[0] || '',
          updatedAt: new Date(),
        },
      },
    );
  } else {
    // New item — push to array
    await carts.updateOne(
      { _id: cartId },
      {
        $push: { items: cartItem },
        $set: { updatedAt: new Date() },
      },
    );
  }

  // Apply TTL for guest carts
  await carts.updateOne(
    { _id: cartId },
    { $set: { updatedAt: new Date() } },
  );

  const updated = await carts.findOne({ _id: cartId });
  if (!updated) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve updated cart',
    });
  }

  return updated;
}

/**
 * Update the quantity of a cart item.
 */
export async function updateCartItemQuantity(
  cartId: string,
  productId: string,
  quantity: number,
  variantInfo?: string,
): Promise<Cart> {
  const db = getDb();
  const carts = db.collection<Cart>(CART_COLLECTION);

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    return removeCartItem(cartId, productId, variantInfo);
  }

  // Check inventory
  const product = await db
    .collection<Product>(PRODUCT_COLLECTION)
    .findOne({ ...idFilter(productId), isActive: true });

  if (!product) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Product not found',
    });
  }

  if (product.inventory < quantity) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient inventory for "${product.name}". Available: ${product.inventory}`,
    });
  }

  const matchQuery: Record<string, unknown> = {
    _id: cartId,
    'items.productId': toObjectId(productId),
  };
  if (variantInfo !== undefined) {
    matchQuery['items.variantInfo'] = variantInfo;
  }

  const result = await carts.findOneAndUpdate(
    matchQuery,
    {
      $set: {
        'items.$.quantity': quantity,
        'items.$.price': product.price,
        'items.$.name': product.name,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Cart item not found',
    });
  }

  return result;
}

/**
 * Remove an item from the cart.
 */
export async function removeCartItem(
  cartId: string,
  productId: string,
  variantInfo?: string,
): Promise<Cart> {
  const db = getDb();
  const carts = db.collection<Cart>(CART_COLLECTION);

  const matchQuery: Record<string, unknown> = {
    productId: toObjectId(productId),
  };
  if (variantInfo !== undefined) {
    matchQuery.variantInfo = variantInfo;
  }

  const result = await carts.findOneAndUpdate(
    { _id: cartId },
    {
      $pull: { items: matchQuery as any },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Cart not found',
    });
  }

  return result;
}

/**
 * Clear all items from the cart.
 */
export async function clearCart(cartId: string): Promise<Cart> {
  const db = getDb();
  const carts = db.collection<Cart>(CART_COLLECTION);

  const result = await carts.findOneAndUpdate(
    { _id: cartId },
    {
      $set: { items: [], updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Cart not found',
    });
  }

  return result;
}
