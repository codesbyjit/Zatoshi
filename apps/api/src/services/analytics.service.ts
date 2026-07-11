/**
 * Analytics service for tracking product and user activity.
 *
 * Provides a high-level API for recording events. Delegates the actual
 * storage to the recommendation service's primitives (incrementProductCounter,
 * trackRecentlyViewed, etc.) to ensure consistency with the data types
 * defined in @repo/types.
 */
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  PRODUCT_ANALYTICS_COLLECTION,
  USER_ACTIVITY_COLLECTION,
  PRODUCT_COLLECTION,
  type ProductAnalytics,
  type UserActivity,
  type Product,
} from '@repo/types';
import {
  incrementProductCounter,
  trackRecentlyViewed,
  trackSearch as recTrackSearch,
  trackClick as recTrackClick,
  getOrCreateUserActivity,
  getTrendingProducts as recGetTrending,
} from './recommendation.service';

const logger = getLogger('api:analytics-service');

// ── Tracking Functions ──────────────────────────────────────────────

/**
 * Record a product view.
 * Increments totalViews counter and updates user's recently viewed.
 */
export async function trackProductView(
  productId: string,
  userId?: string,
): Promise<void> {
  try {
    await incrementProductCounter(productId, 'totalViews', 1);

    if (userId) {
      const db = getDb();
      const product = await db
        .collection<Product>(PRODUCT_COLLECTION)
        .findOne({ _id: productId });

      await trackRecentlyViewed(userId, {
        productId,
        productName: product?.name ?? 'Unknown',
        price: product?.price ?? 0,
        image: product?.images?.[0] ?? '',
      });

      // Update category interest
      if (product?.categoryId) {
        const userCol = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);
        await userCol.updateOne(
          { _id: userId },
          { $inc: { [`categoryInterests.${product.categoryId}`]: 1 } as any },
        );
      }
    }
  } catch (err) {
    logger.warn({ err, productId }, 'Failed to track product view');
  }
}

/**
 * Record a product click.
 */
export async function trackProductClick(
  productId: string,
  userId?: string,
): Promise<void> {
  try {
    await incrementProductCounter(productId, 'productClicks', 1);
    if (userId) {
      await recTrackClick(userId, productId);
    }
  } catch (err) {
    logger.warn({ err, productId }, 'Failed to track product click');
  }
}

/**
 * Record an add-to-cart event.
 */
export async function trackAddToCart(
  productId: string,
): Promise<void> {
  try {
    await incrementProductCounter(productId, 'addToCartCount', 1);
  } catch (err) {
    logger.warn({ err, productId }, 'Failed to track add-to-cart');
  }
}

/**
 * Record a remove-from-cart event.
 */
export async function trackRemoveFromCart(
  productId: string,
): Promise<void> {
  try {
    await incrementProductCounter(productId, 'removeFromCartCount', 1);
  } catch (err) {
    logger.warn({ err, productId }, 'Failed to track remove-from-cart');
  }
}

/**
 * Record purchases.
 */
export async function trackPurchase(
  productIds: string[],
  userId?: string,
): Promise<void> {
  try {
    const db = getDb();
    for (const productId of productIds) {
      await incrementProductCounter(productId, 'purchases', 1);
    }

    if (userId) {
      await getOrCreateUserActivity(userId);
      await db.collection<UserActivity>(USER_ACTIVITY_COLLECTION).updateOne(
        { _id: userId },
        {
          $addToSet: { purchases: { $each: productIds } },
          $set: { lastActive: new Date(), updatedAt: new Date() },
        },
      );
    }
  } catch (err) {
    logger.warn({ err, productIds }, 'Failed to track purchase');
  }
}

/**
 * Record a search query.
 */
export async function trackSearch(
  query: string,
  userId?: string,
): Promise<void> {
  try {
    if (userId) {
      await recTrackSearch(userId, query);
    }
  } catch (err) {
    logger.warn({ err, query }, 'Failed to track search');
  }
}

/**
 * Record a share event.
 */
export async function trackShare(
  productId: string,
): Promise<void> {
  try {
    await incrementProductCounter(productId, 'shareCount', 1);
  } catch (err) {
    logger.warn({ err, productId }, 'Failed to track share');
  }
}

// ── Query Functions ─────────────────────────────────────────────────

/**
 * Get analytics for a single product.
 */
export async function getProductAnalytics(
  productId: string,
): Promise<ProductAnalytics | null> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);
  return col.findOne({ _id: productId });
}

/**
 * Get the current user's activity profile.
 */
export async function getUserActivity(
  userId: string,
): Promise<UserActivity | null> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);
  return col.findOne({ _id: userId });
}

/**
 * Get trending products (delegates to trending service).
 */
export { recGetTrending as getTrendingProducts };
