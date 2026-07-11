/**
 * Trending and popularity calculation service.
 *
 * Computes trending scores based on:
 * - Recent view velocity (views in last 24h vs 7d)
 * - Purchase velocity
 * - Recency bonus (newer products get a boost)
 * - Rating-weighted boost
 *
 * Score formula:
 *   trendingScore = (recentViews * w1) + (recentPurchases * w2) + (recencyBonus * w3) + (ratingBoost * w4)
 */
import { getDb } from '../db/client';
import { getRedis } from '../db/redis';
import { getLogger } from '@repo/utils';
import {
  PRODUCT_COLLECTION,
  PRODUCT_ANALYTICS_COLLECTION,
  type Product,
  type ProductAnalytics,
} from '@repo/types';

const logger = getLogger('api:trending-service');

// ── Configuration ───────────────────────────────────────────────────

const TRENDING_CACHE_TTL = 300; // 5 minutes
const TRENDING_CACHE_KEY = 'trending:products';

const WEIGHTS = {
  recentViews: 1,
  recentPurchases: 10,
  recencyBonus: 5,
  ratingBoost: 3,
} as const;

const RECENCY_HOURS = 72; // Products get recency bonus within 72 hours

// ── Trending Score Calculation ──────────────────────────────────────

export interface TrendingProduct {
  productId: string;
  score: number;
  views: number;
  purchases: number;
  rating: number;
}

/**
 * Calculate trending scores for all active products.
 * Returns products sorted by trending score descending.
 */
export async function calculateTrending(
  limit: number = 20,
): Promise<TrendingProduct[]> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  const analytics = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  // Get all active products with their analytics
  const activeProducts = await products
    .find({ isActive: true })
    .project({ _id: 1, name: 1, rating: 1, createdAt: 1, price: 1 })
    .toArray();

  if (activeProducts.length === 0) return [];

  const productIds = activeProducts.map((p) => p._id);

  // Fetch analytics for these products
  const analyticsDocs = await analytics
    .find({ _id: { $in: productIds as any } })
    .toArray();

  const analyticsMap = new Map<string, ProductAnalytics>();
  for (const doc of analyticsDocs) {
    analyticsMap.set(doc._id, doc);
  }

  const now = Date.now();
  const results: TrendingProduct[] = [];

  for (const product of activeProducts) {
    const an = analyticsMap.get(product._id);
    if (!an) continue;

    // Calculate recency bonus: higher for newer products
    const ageHours =
      (now - product.createdAt.getTime()) / (1000 * 60 * 60);
    const recencyBonus = ageHours < RECENCY_HOURS
      ? 1 - ageHours / RECENCY_HOURS
      : 0;

    // Rating boost: 0 for unrated, up to 1 for 5-star
    const ratingBoost = product.rating ? product.rating / 5 : 0;

    const score =
      an.totalViews * WEIGHTS.recentViews +
      an.purchases * WEIGHTS.recentPurchases +
      recencyBonus * WEIGHTS.recencyBonus +
      ratingBoost * WEIGHTS.ratingBoost;

    results.push({
      productId: product._id,
      score,
      views: an.totalViews,
      purchases: an.purchases,
      rating: product.rating,
    });
  }

  // Sort descending by score, take top N
  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, limit);

  // Cache in Redis
  const redis = getRedis();
  if (redis) {
    try {
      await redis.setex(
        TRENDING_CACHE_KEY,
        TRENDING_CACHE_TTL,
        JSON.stringify(top),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to cache trending products');
    }
  }

  return top;
}

/**
 * Get trending products — tries Redis cache first, falls back to recalculation.
 */
export async function getTrendingProducts(
  limit: number = 20,
): Promise<TrendingProduct[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(TRENDING_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as TrendingProduct[];
        logger.debug({ count: parsed.length }, 'Returning cached trending');
        return parsed.slice(0, limit);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to read trending cache');
    }
  }

  return calculateTrending(limit);
}

/**
 * Bump a product's view count in the analytics collection.
 * Called on every product view to keep analytics fresh.
 */
export async function recordProductView(productId: string): Promise<void> {
  const db = getDb();
  const analytics = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  await analytics.updateOne(
    { _id: productId },
    {
      $inc: { totalViews: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );
}
