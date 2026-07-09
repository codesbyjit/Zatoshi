import { getLogger } from '@repo/utils';
import { PRODUCT_COLLECTION } from '@repo/types';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';

const logger = getLogger('worker:inventory');

/**
 * Decrement product inventory by a given quantity.
 * Uses MongoDB's $inc with a filter to prevent going below zero.
 *
 * @param productId - The product ID
 * @param variantName - Optional variant name (null for base product)
 * @param quantity - Quantity to decrement (must be positive)
 */
export async function decrementInventory(
  productId: string,
  variantName: string | null,
  quantity: number,
): Promise<void> {
  const db = getDb();
  const collection = db.collection(PRODUCT_COLLECTION);

  if (quantity <= 0) {
    throw new Error(`Invalid decrement quantity: ${quantity}. Must be positive.`);
  }

  if (variantName) {
    // Decrement variant inventory
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(productId),
        'variants.name': variantName,
        'variants.inventory': { $gte: quantity },
      },
      {
        $inc: { 'variants.$.inventory': -quantity },
      },
      { returnDocument: 'after' },
    );

    if (!result) {
      // Check if the variant exists
      const product = await collection.findOne({ _id: new ObjectId(productId) });
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      const variantExists = product.variants?.some(
        (v: { name: string }) => v.name === variantName,
      );
      if (!variantExists) {
        throw new Error(`Variant "${variantName}" not found on product ${productId}`);
      }
      throw new Error(
        `Insufficient inventory for variant "${variantName}" on product ${productId}`,
      );
    }

    logger.info(
      { productId, variantName, quantity },
      'Decremented variant inventory',
    );
  } else {
    // Decrement base product inventory
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(productId),
        inventory: { $gte: quantity },
      },
      {
        $inc: { inventory: -quantity },
      },
      { returnDocument: 'after' },
    );

    if (!result) {
      const product = await collection.findOne({ _id: new ObjectId(productId) });
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }
      throw new Error(
        `Insufficient inventory for product ${productId}. Available: ${product.inventory}, requested: ${quantity}`,
      );
    }

    logger.info({ productId, quantity }, 'Decremented product inventory');
  }
}

/**
 * Increment product inventory by a given quantity (e.g., for cancellations).
 *
 * @param productId - The product ID
 * @param variantName - Optional variant name (null for base product)
 * @param quantity - Quantity to increment (must be positive)
 */
export async function incrementInventory(
  productId: string,
  variantName: string | null,
  quantity: number,
): Promise<void> {
  const db = getDb();
  const collection = db.collection(PRODUCT_COLLECTION);

  if (quantity <= 0) {
    throw new Error(`Invalid increment quantity: ${quantity}. Must be positive.`);
  }

  if (variantName) {
    await collection.findOneAndUpdate(
      {
        _id: new ObjectId(productId),
        'variants.name': variantName,
      },
      {
        $inc: { 'variants.$.inventory': quantity },
      },
    );

    logger.info(
      { productId, variantName, quantity },
      'Incremented variant inventory',
    );
  } else {
    await collection.findOneAndUpdate(
      { _id: new ObjectId(productId) },
      { $inc: { inventory: quantity } },
    );

    logger.info({ productId, quantity }, 'Incremented product inventory');
  }
}
