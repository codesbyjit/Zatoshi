import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  PRODUCT_ANALYTICS_COLLECTION,
  USER_ACTIVITY_COLLECTION,
  REVIEWS_COLLECTION,
  RECOMMENDATION_CACHE_COLLECTION,
  PRODUCT_COLLECTION,
  ORDER_COLLECTION,
  USER_ACTIVITY_CAPS,
  type ProductAnalytics,
  type UserActivity,
  type Review,
  type CreateReviewInput,
  type UpdateReviewInput,
  type CreateRecommendationCacheInput,
  type RecommendationCache,
  type RecommendationType,
  type Product,
} from '@repo/types';

const logger = getLogger('api:recommendation-service');

// ──────────────────────────────────────────
// Product Analytics
// ──────────────────────────────────────────

/**
 * Get analytics for a single product.
 */
export async function getProductAnalytics(productId: string): Promise<ProductAnalytics | null> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);
  return col.findOne({ _id: productId });
}

/**
 * Create analytics record for a new product.
 */
export async function createProductAnalytics(
  productId: string,
): Promise<ProductAnalytics> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  const now = new Date();
  const doc: ProductAnalytics = {
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
    avgTimeSpent: 0,
    bounceRate: 0,
    conversionRate: 0,
    productRating: 0,
    ratingCount: 0,
    reviewCount: 0,
    trendingScore: 0,
    popularityScore: 0,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(doc);
  return doc;
}

/**
 * Increment a single counter field on product analytics.
 * Uses $inc for atomic updates.
 */
export async function incrementProductCounter(
  productId: string,
  field: keyof Pick<
    ProductAnalytics,
    | 'totalViews'
    | 'uniqueViews'
    | 'productClicks'
    | 'addToCartCount'
    | 'removeFromCartCount'
    | 'wishlistCount'
    | 'purchases'
    | 'orderCount'
    | 'searchCount'
    | 'shareCount'
    | 'ratingCount'
    | 'reviewCount'
  >,
  amount = 1,
): Promise<void> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  const update: Record<string, unknown> = {
    $inc: { [field]: amount },
    $set: { updatedAt: new Date() },
  };

  const result = await col.updateOne({ _id: productId }, update as any);

  if (result.matchedCount === 0) {
    // Auto-create if product analytics doesn't exist yet
    await createProductAnalytics(productId);
    await col.updateOne({ _id: productId }, update as any);
  }
}

/**
 * Atomically update time-based metrics (average time spent, bounce rate, conversion rate).
 */
export async function updateProductTimeMetrics(
  productId: string,
  metrics: {
    avgTimeSpent?: number;
    bounceRate?: number;
    conversionRate?: number;
  },
): Promise<void> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (metrics.avgTimeSpent !== undefined) $set.avgTimeSpent = metrics.avgTimeSpent;
  if (metrics.bounceRate !== undefined) $set.bounceRate = metrics.bounceRate;
  if (metrics.conversionRate !== undefined) $set.conversionRate = metrics.conversionRate;

  await col.updateOne({ _id: productId }, { $set } as any);
}

/**
 * Update trending and popularity scores (called by background worker).
 */
export async function updateProductScores(
  productId: string,
  scores: { trendingScore?: number; popularityScore?: number },
): Promise<void> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (scores.trendingScore !== undefined) $set.trendingScore = scores.trendingScore;
  if (scores.popularityScore !== undefined) $set.popularityScore = scores.popularityScore;

  await col.updateOne({ _id: productId }, { $set } as any);
}

/**
 * Get trending products sorted by trendingScore with optional recency filter.
 */
export async function getTrendingProducts(
  limit = 20,
  since?: Date,
): Promise<ProductAnalytics[]> {
  const db = getDb();
  const col = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  const query: Record<string, unknown> = {};
  if (since) {
    query.updatedAt = { $gte: since };
  }

  return col
    .find(query)
    .sort({ trendingScore: -1 })
    .limit(limit)
    .toArray();
}

// ──────────────────────────────────────────
// User Activity
// ──────────────────────────────────────────

/**
 * Get activity document for a user. Creates one if it doesn't exist.
 */
export async function getOrCreateUserActivity(userId: string): Promise<UserActivity> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  const existing = await col.findOne({ _id: userId });
  if (existing) return existing;

  const now = new Date();
  const doc: UserActivity = {
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
  };

  await col.insertOne(doc);
  return doc;
}

/**
 * Track a recently viewed product for a user.
 * Uses $push + $slice to cap at max entries.
 */
export async function trackRecentlyViewed(
  userId: string,
  entry: { productId: string; productName: string; price: number; image: string },
): Promise<void> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  await col.updateOne(
    { _id: userId },
    {
      $push: {
        recentlyViewed: {
          $each: [{ ...entry, viewedAt: new Date() }],
          $sort: { viewedAt: -1 },
          $slice: USER_ACTIVITY_CAPS.RECENTLY_VIEWED,
        },
      },
      $set: { lastActive: new Date(), updatedAt: new Date() },
    },
    { upsert: true },
  );
}

/**
 * Track a search query for a user.
 */
export async function trackSearch(
  userId: string,
  query: string,
): Promise<void> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  await col.updateOne(
    { _id: userId },
    {
      $push: {
        searchHistory: {
          $each: [{ query, timestamp: new Date() }],
          $sort: { timestamp: -1 },
          $slice: USER_ACTIVITY_CAPS.SEARCH_HISTORY,
        },
      },
      $set: { lastActive: new Date(), updatedAt: new Date() },
    },
    { upsert: true },
  );
}

/**
 * Track a product click for a user.
 */
export async function trackClick(
  userId: string,
  productId: string,
): Promise<void> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  await col.updateOne(
    { _id: userId },
    {
      $push: {
        clickHistory: {
          $each: [{ productId, timestamp: new Date() }],
          $sort: { timestamp: -1 },
          $slice: USER_ACTIVITY_CAPS.CLICK_HISTORY,
        },
      },
      $set: { lastActive: new Date(), updatedAt: new Date() },
    },
    { upsert: true },
  );
}

/**
 * Track browsing history (category visit) for a user.
 */
export async function trackBrowsing(
  userId: string,
  entry: { categoryId: string; categoryName: string; duration: number },
): Promise<void> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  await col.updateOne(
    { _id: userId },
    {
      $push: {
        browsingHistory: {
          $each: [{ ...entry, timestamp: new Date() }],
          $sort: { timestamp: -1 },
          $slice: USER_ACTIVITY_CAPS.BROWSING_HISTORY,
        },
      },
      $set: { lastActive: new Date(), updatedAt: new Date() },
    },
    { upsert: true },
  );
}

/**
 * Update user interest scores for categories and brands.
 */
export async function updateInterests(
  userId: string,
  interests: {
    categoryId?: string;
    brand?: string;
    price?: number;
  },
): Promise<void> {
  const db = getDb();
  const col = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  const incClause: Record<string, number> = {};
  if (interests.categoryId) {
    incClause[`categoryInterests.${interests.categoryId}`] = 1;
  }
  if (interests.brand) {
    incClause[`brandInterests.${interests.brand}`] = 1;
  }

  const setClause: Record<string, unknown> = {
    lastActive: new Date(),
    updatedAt: new Date(),
  };

  if (interests.price !== undefined) {
    // Use aggregation pipeline to safely compute min/max of price preferences
    const existing = await col.findOne({ _id: userId });
    const currentMin = existing?.pricePreferences?.min ?? interests.price;
    const currentMax = existing?.pricePreferences?.max ?? interests.price;
    setClause['pricePreferences.min'] = Math.min(currentMin, interests.price);
    setClause['pricePreferences.max'] = Math.max(currentMax, interests.price);
  }

  await col.updateOne(
    { _id: userId },
    { $inc: incClause, $set: setClause } as any,
    { upsert: true },
  );
}

// ──────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────

export async function getReviewById(id: string): Promise<Review | null> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);
  return col.findOne({ _id: id });
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);

  // Check for duplicate (one review per user per product)
  const existing = await col.findOne({
    userId: input.userId,
    productId: input.productId,
  });
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'You have already reviewed this product',
    });
  }

  const now = new Date();
  const review: Review = {
    _id: randomUUID(),
    ...input,
    helpfulCount: 0,
    reportCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(review);

  // Update product analytics rating aggregates
  await updateProductRatingAggregates(input.productId);

  logger.info({ reviewId: review._id, productId: input.productId }, 'Review created');
  return review;
}

export async function updateReview(
  id: string,
  userId: string,
  input: UpdateReviewInput,
): Promise<Review> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);

  const review = await col.findOne({ _id: id });
  if (!review) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' });
  }
  if (review.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your review' });
  }

  const result = await col.findOneAndUpdate(
    { _id: id },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (result) {
    await updateProductRatingAggregates(result.productId);
  }

  return result!;
}

export async function deleteReview(id: string, userId: string): Promise<void> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);

  const review = await col.findOne({ _id: id });
  if (!review) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' });
  }
  if (review.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your review' });
  }

  await col.deleteOne({ _id: id });
  await updateProductRatingAggregates(review.productId);
}

export async function getReviewsByProduct(
  productId: string,
  options: {
    sortBy?: 'helpful' | 'newest' | 'oldest' | 'highest' | 'lowest';
    page?: number;
    limit?: number;
  } = {},
): Promise<{ items: Review[]; total: number; page: number; limit: number; totalPages: number }> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);

  const { sortBy = 'newest', page = 1, limit = 20 } = options;

  const sortMap: Record<string, 1 | -1> = {
    helpful: { helpfulCount: -1, createdAt: -1 } as any,
    newest: { createdAt: -1 } as any,
    oldest: { createdAt: 1 } as any,
    highest: { rating: -1, createdAt: -1 } as any,
    lowest: { rating: 1, createdAt: -1 } as any,
  };

  const sort = sortMap[sortBy] ?? sortMap.newest;
  const skip = (page - 1) * limit;

  const cursor = col.find({ productId }).sort(sort).skip(skip).limit(limit);

  const [items, total] = await Promise.all([
    cursor.toArray(),
    col.countDocuments({ productId }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getReviewsByUser(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ items: Review[]; total: number }> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);

  const skip = (page - 1) * limit;
  const cursor = col.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);

  const [items, total] = await Promise.all([
    cursor.toArray(),
    col.countDocuments({ userId }),
  ]);

  return { items, total };
}

export async function markReviewHelpful(id: string): Promise<void> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);
  await col.updateOne({ _id: id }, { $inc: { helpfulCount: 1 } });
}

export async function reportReview(id: string): Promise<void> {
  const db = getDb();
  const col = db.collection<Review>(REVIEWS_COLLECTION);
  await col.updateOne({ _id: id }, { $inc: { reportCount: 1 } });
}

/**
 * Recalculate aggregate rating for a product based on all reviews.
 */
async function updateProductRatingAggregates(productId: string): Promise<void> {
  const db = getDb();
  const reviewsCol = db.collection<Review>(REVIEWS_COLLECTION);
  const analyticsCol = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);

  const pipeline = [
    { $match: { productId } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ];

  const [result] = await reviewsCol.aggregate(pipeline).toArray();

  if (result) {
    await analyticsCol.updateOne(
      { _id: productId },
      {
        $set: {
          productRating: Math.round(result.avgRating * 100) / 100,
          ratingCount: result.count,
          reviewCount: result.count,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

// ──────────────────────────────────────────
// Recommendation Cache
// ──────────────────────────────────────────

export async function getCachedRecommendations(
  userId: string | null,
  type: RecommendationType,
  context?: { categoryId?: string; productId?: string },
): Promise<RecommendationCache | null> {
  const db = getDb();
  const col = db.collection<RecommendationCache>(RECOMMENDATION_CACHE_COLLECTION);

  const query: Record<string, unknown> = {
    userId: userId ?? null,
    type,
  };

  if (context?.productId) {
    query['context.productId'] = context.productId;
  }
  if (context?.categoryId) {
    query['context.categoryId'] = context.categoryId;
  }

  return col.findOne(query, { sort: { computedAt: -1 } });
}

export async function setCachedRecommendations(
  input: CreateRecommendationCacheInput,
): Promise<RecommendationCache> {
  const db = getDb();
  const col = db.collection<RecommendationCache>(RECOMMENDATION_CACHE_COLLECTION);

  const now = new Date();
  const doc: RecommendationCache = {
    _id: randomUUID(),
    ...input,
    computedAt: now,
  };

  // Replace existing cache for same (userId, type, context)
  const filter: Record<string, unknown> = {
    userId: doc.userId ?? null,
    type: doc.type,
  };
  if (doc.context?.productId) filter['context.productId'] = doc.context.productId;
  if (doc.context?.categoryId) filter['context.categoryId'] = doc.context.categoryId;

  await col.deleteMany(filter);
  await col.insertOne(doc);

  return doc;
}

export async function clearUserRecommendationCache(userId: string): Promise<void> {
  const db = getDb();
  const col = db.collection<RecommendationCache>(RECOMMENDATION_CACHE_COLLECTION);
  await col.deleteMany({ userId });
}

// ──────────────────────────────────────────
// High-level Recommendation Generation
// ──────────────────────────────────────────

function toIds(ids: string[]): unknown[] {
  return ids.map((id) => /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : id);
}

export async function getProductsByIds(productIds: string[]): Promise<Product[]> {
  const map = await getProductsMap(productIds);
  return productIds.map((id) => map.get(id)).filter(Boolean) as Product[];
}

async function getProductsMap(productIds: string[]): Promise<Map<string, Product>> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  const objectIdIds = productIds
    .filter((id) => /^[a-f0-9]{24}$/i.test(id))
    .map((id) => new ObjectId(id));
  const stringIds = productIds.filter((id) => !/^[a-f0-9]{24}$/i.test(id));

  const docs = await products
    .find({
      $or: [
        { _id: { $in: objectIdIds } as any },
        ...(stringIds.length > 0 ? [{ _id: { $in: stringIds } }] : []),
      ],
    } as any)
    .toArray();

  const map = new Map<string, Product>();
  for (const doc of docs) {
    map.set(doc._id.toString(), doc);
  }
  return map;
}

export async function getPersonalizedRecommendations(
  userId: string,
  limit = 12,
): Promise<Product[]> {
  const db = getDb();
  const activity = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);
  const allProducts = await db.collection<Product>(PRODUCT_COLLECTION).find({ isActive: true }).toArray();

  const userActivity = await activity.findOne({ _id: userId });
  if (!userActivity) {
    const trending = await getTrendingProducts(limit);
    const trendingIds = trending.map((t) => t._id);
    const productMap = await getProductsMap(trendingIds);
    return trendingIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
  }

  const recentlyViewedIds = new Set(
    (userActivity.recentlyViewed || []).map((v: any) => v.productId),
  );
  const purchasedIds = new Set(userActivity.purchases || []);
  const categoryInterests: Record<string, number> = userActivity.categoryInterests || {};

  interface ScoredProduct { productId: string; score: number }
  const scored: ScoredProduct[] = [];

  for (const product of allProducts) {
    const pid = product._id.toString();
    if (recentlyViewedIds.has(pid) || purchasedIds.has(pid)) continue;

    let score = 0;
    if (categoryInterests[product.categoryId]) {
      score += categoryInterests[product.categoryId] * 2;
    }

    const userTagSet = new Set<string>();
    for (const entry of userActivity.recentlyViewed || []) {
      const p = allProducts.find((ap) => ap._id.toString() === entry.productId);
      if (p) p.tags.forEach((t: string) => userTagSet.add(t));
    }
    const overlap = product.tags.filter((t) => userTagSet.has(t)).length;
    score += overlap * 0.5;
    if (product.isFeatured) score += 3;
    score += (product.rating || 0) * 0.5;

    scored.push({ productId: pid, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const topIds = scored.slice(0, limit).map((s) => s.productId);
  const productMap = await getProductsMap(topIds);
  return topIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
}

export async function getSimilarProducts(
  productId: string,
  limit = 8,
): Promise<Product[]> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  const pid = /^[a-f0-9]{24}$/i.test(productId) ? new ObjectId(productId) : productId;

  const product = await products.findOne({ _id: pid as any, isActive: true });
  if (!product) return [];

  const allProducts = await products
    .find({ _id: { $ne: pid } as any, isActive: true })
    .toArray();

  interface ScoredProduct { productId: string; score: number }
  const scored: ScoredProduct[] = [];

  for (const other of allProducts) {
    let score = 0;
    if (other.categoryId === product.categoryId) score += 5;
    const tagOverlap = other.tags.filter((t) => product.tags.includes(t)).length;
    score += tagOverlap * 2;
    const priceDiff = Math.abs(other.price - product.price);
    score += Math.max(0, 1 - priceDiff / Math.max(product.price, 0.01));
    score += (other.rating || 0) * 0.3;
    scored.push({ productId: other._id.toString(), score });
  }

  scored.sort((a, b) => b.score - a.score);
  const topIds = scored.slice(0, limit).map((s) => s.productId);
  const productMap = await getProductsMap(topIds);
  return topIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
}

export async function getPopularProducts(limit = 12): Promise<Product[]> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  return products
    .find({ isActive: true })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(limit)
    .toArray();
}

export async function getFrequentlyBoughtTogether(
  productId: string,
  limit = 6,
): Promise<Product[]> {
  const db = getDb();
  const orders = db.collection(ORDER_COLLECTION);
  const pid = /^[a-f0-9]{24}$/i.test(productId) ? new ObjectId(productId) : productId;

  const coPurchased = await orders
    .aggregate([
      { $match: { status: 'delivered', 'items.productId': pid } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $ne: pid } } },
      { $group: { _id: '$items.productId', count: { $sum: '$items.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
    .toArray();

  const topIds = coPurchased.map((r: any) => r._id.toString());
  const productMap = await getProductsMap(topIds);
  return topIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
}

export async function getCategoryTopProducts(
  categoryId: string,
  limit = 8,
): Promise<Product[]> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  return products
    .find({ categoryId, isActive: true })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(limit)
    .toArray();
}

export async function getRecentlyViewedProducts(
  userId: string,
  limit = 10,
): Promise<Product[]> {
  const db = getDb();
  const activity = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);

  const userActivity = await activity.findOne({ _id: userId });
  if (!userActivity || !userActivity.recentlyViewed?.length) return [];

  const entries = (userActivity.recentlyViewed as any[]).slice(0, limit);
  const productIds = entries.map((e: any) => e.productId);
  const productMap = await getProductsMap(productIds);
  return productIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
}

export async function getRelatedProducts(
  productIds: string[],
  limit = 8,
): Promise<Product[]> {
  if (!productIds.length) return [];

  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);

  const sourceProducts = await products
    .find({ _id: { $in: toIds(productIds) } as any })
    .toArray();

  const categoryIds = [...new Set(sourceProducts.map((p) => p.categoryId))];
  const allTags = [...new Set(sourceProducts.flatMap((p) => p.tags))];

  const candidates = await products
    .find({ _id: { $nin: toIds(productIds) } as any, isActive: true })
    .toArray();

  interface ScoredProduct { productId: string; score: number }
  const scored: ScoredProduct[] = [];

  for (const candidate of candidates) {
    let score = 0;
    if (categoryIds.includes(candidate.categoryId)) score += 3;
    const tagOverlap = candidate.tags.filter((t) => allTags.includes(t)).length;
    score += tagOverlap;
    score += (candidate.rating || 0) * 0.2;
    scored.push({ productId: candidate._id.toString(), score });
  }

  scored.sort((a, b) => b.score - a.score);
  const topIds = scored.slice(0, limit).map((s) => s.productId);
  const productMap = await getProductsMap(topIds);
  return topIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
}
