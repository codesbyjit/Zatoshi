import { randomUUID } from 'node:crypto';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  PRODUCT_ANALYTICS_COLLECTION,
  USER_ACTIVITY_COLLECTION,
} from '@repo/types';
import { Double } from 'mongodb';

const logger = getLogger('api:analytics-tracking');

// ─── Product Analytics ─────────────────────────────

async function ensureProductAnalytics(productId: string): Promise<void> {
  const db = getDb();
  const analytics = db.collection(PRODUCT_ANALYTICS_COLLECTION);

  const existing = await analytics.findOne({ _id: productId } as any);
  if (!existing) {
    const now = new Date();
    await (analytics as any).insertOne({
      _id: productId,
      totalViews: 0,
      uniqueViews: 0,
      productClicks: 0,
      addToCartCount: 0,
      removeFromCartCount: 0,
      wishlistCount: 0,
      purchases: 0,
      orderCount: 0,
      searchCount: 0,
      shareCount: 0,
      avgTimeSpent: new Double(0),
      bounceRate: new Double(0),
      conversionRate: new Double(0),
      productRating: new Double(0),
      ratingCount: 0,
      reviewCount: 0,
      trendingScore: new Double(0),
      popularityScore: new Double(0),
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function incrementProductAnalytics(
  productId: string,
  field: string,
): Promise<void> {
  const db = getDb();
  const analytics = db.collection(PRODUCT_ANALYTICS_COLLECTION);

  await (analytics as any).updateOne(
    { _id: productId },
    {
      $inc: { [field]: 1 },
      $set: { updatedAt: new Date() },
    },
  );
}

// ─── User Activity ─────────────────────────────────

async function ensureUserActivity(userId: string): Promise<void> {
  const db = getDb();
  const activity = db.collection(USER_ACTIVITY_COLLECTION);

  const existing = await activity.findOne({ _id: userId } as any);
  if (!existing) {
    const now = new Date();
    await (activity as any).insertOne({
      _id: userId,
      recentlyViewed: [],
      searchHistory: [],
      clickHistory: [],
      browsingHistory: [],
      wishlist: [],
      cart: [],
      orders: [],
      purchases: [],
      categoryInterests: {},
      brandInterests: {},
      pricePreferences: { min: 0, max: 0 },
      device: '',
      sessionDuration: 0,
      lastActive: now,
      preferredCategories: [],
      preferredBrands: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function updateUserLastActive(userId: string): Promise<void> {
  const db = getDb();
  const activity = db.collection(USER_ACTIVITY_COLLECTION);
  await (activity as any).updateOne(
    { _id: userId },
    { $set: { lastActive: new Date(), updatedAt: new Date() } },
  );
}

// ─── Public API ────────────────────────────────────

export async function trackProductView(
  productId: string,
  options: {
    userId?: string;
    sessionId?: string;
    source?: string;
  },
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await ensureProductAnalytics(productId);
  await incrementProductAnalytics(productId, 'totalViews');

  if (options.userId) {
    await ensureUserActivity(options.userId);
    const activity = db.collection(USER_ACTIVITY_COLLECTION);

    await (activity as any).updateOne(
      { _id: options.userId },
      {
        $push: {
          recentlyViewed: {
            $each: [{ productId, viewedAt: now }],
            $position: 0,
            $slice: 50,
          },
        },
        $set: { lastActive: now, updatedAt: now },
      },
    );
  }

  logger.debug({ productId, userId: options.userId, source: options.source }, 'Product view tracked');
}

export async function trackProductClick(
  productId: string,
  options: {
    userId?: string;
    sessionId?: string;
    context?: string;
  },
): Promise<void> {
  const now = new Date();

  await ensureProductAnalytics(productId);
  await incrementProductAnalytics(productId, 'productClicks');

  if (options.userId) {
    await ensureUserActivity(options.userId);
    await updateUserLastActive(options.userId);
  }

  logger.debug({ productId, userId: options.userId, context: options.context }, 'Product click tracked');
}

export async function trackSearch(
  query: string,
  options: {
    userId?: string;
    sessionId?: string;
    resultCount?: number;
  },
): Promise<void> {
  const db = getDb();
  const now = new Date();

  if (options.userId) {
    await ensureUserActivity(options.userId);
    const activity = db.collection(USER_ACTIVITY_COLLECTION);

    await (activity as any).updateOne(
      { _id: options.userId },
      {
        $push: {
          searchHistory: {
            $each: [{ query, timestamp: now }],
            $position: 0,
            $slice: 50,
          },
        },
        $set: { lastActive: now, updatedAt: now },
      },
    );
  }

  logger.debug({ query, userId: options.userId, resultCount: options.resultCount }, 'Search tracked');
}

export async function trackAddToCart(
  productId: string,
  options: {
    userId?: string;
    sessionId?: string;
  },
): Promise<void> {
  await ensureProductAnalytics(productId);
  await incrementProductAnalytics(productId, 'addToCartCount');

  if (options.userId) {
    await updateUserLastActive(options.userId);
  }

  logger.debug({ productId, userId: options.userId }, 'Add-to-cart tracked');
}

export async function recordPurchase(
  userId: string,
  productIds: string[],
  total: number,
): Promise<void> {
  const db = getDb();
  const analytics = db.collection(PRODUCT_ANALYTICS_COLLECTION);
  const now = new Date();

  for (const productId of productIds) {
    await ensureProductAnalytics(productId);
    await (analytics as any).updateOne(
      { _id: productId },
      {
        $inc: { purchases: 1 },
        $set: { lastPurchasedAt: now, updatedAt: now },
      },
    );
  }

  await ensureUserActivity(userId);
  const activity = db.collection(USER_ACTIVITY_COLLECTION);
  await (activity as any).updateOne(
    { _id: userId },
    {
      $push: {
        purchases: { $each: productIds },
      },
      $set: { lastActive: now, updatedAt: now },
    },
  );

  logger.debug({ userId, productIds }, 'Purchase recorded for recommendations');
}
