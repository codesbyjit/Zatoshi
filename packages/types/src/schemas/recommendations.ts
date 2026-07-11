import { z } from 'zod';

// ──────────────────────────────────────────
// Product Analytics Schema — collection: product_analytics
// One document per product. _id IS the productId.
// ──────────────────────────────────────────

export const ProductAnalyticsSchema = z.object({
  _id: z.string(), // productId

  // Views & engagement
  totalViews: z.number().int().min(0).default(0),
  uniqueViews: z.number().int().min(0).default(0),
  productClicks: z.number().int().min(0).default(0),

  // Cart actions
  addToCartCount: z.number().int().min(0).default(0),
  removeFromCartCount: z.number().int().min(0).default(0),

  // Wishlist
  wishlistCount: z.number().int().min(0).default(0),

  // Purchase funnel
  purchases: z.number().int().min(0).default(0),
  orderCount: z.number().int().min(0).default(0),

  // Discovery
  searchCount: z.number().int().min(0).default(0),
  shareCount: z.number().int().min(0).default(0),

  // Time-based metrics
  avgTimeSpent: z.number().min(0).default(0), // seconds
  bounceRate: z.number().min(0).max(1).default(0), // 0.0–1.0
  conversionRate: z.number().min(0).max(1).default(0), // 0.0–1.0

  // Rating
  productRating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().min(0).default(0),
  reviewCount: z.number().int().min(0).default(0),

  // Scoring — periodically recomputed by background worker
  trendingScore: z.number().default(0),
  popularityScore: z.number().default(0),

  // Recency tracking for time-decay calculations
  lastViewedAt: z.date().optional(),
  lastPurchasedAt: z.date().optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProductAnalytics = z.infer<typeof ProductAnalyticsSchema>;

export const CreateProductAnalyticsInputSchema = ProductAnalyticsSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProductAnalyticsInput = z.infer<typeof CreateProductAnalyticsInputSchema>;

// ──────────────────────────────────────────
// Embedded sub-types for user_activity
// ──────────────────────────────────────────

export const RecentlyViewedEntrySchema = z.object({
  productId: z.string(),
  productName: z.string(),
  price: z.number().positive().multipleOf(0.01),
  image: z.string(),
  viewedAt: z.date(),
});
export type RecentlyViewedEntry = z.infer<typeof RecentlyViewedEntrySchema>;

export const SearchHistoryEntrySchema = z.object({
  query: z.string(),
  timestamp: z.date(),
});
export type SearchHistoryEntry = z.infer<typeof SearchHistoryEntrySchema>;

export const ClickHistoryEntrySchema = z.object({
  productId: z.string(),
  timestamp: z.date(),
});
export type ClickHistoryEntry = z.infer<typeof ClickHistoryEntrySchema>;

export const BrowsingHistoryEntrySchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  timestamp: z.date(),
  duration: z.number().min(0), // seconds
});
export type BrowsingHistoryEntry = z.infer<typeof BrowsingHistoryEntrySchema>;

// ──────────────────────────────────────────
// User Activity Schema — collection: user_activity
// One document per user, keyed by userId
// ──────────────────────────────────────────

export const PricePreferencesSchema = z.object({
  min: z.number().min(0).default(0),
  max: z.number().min(0).default(0),
});
export type PricePreferences = z.infer<typeof PricePreferencesSchema>;

/** Max entries in each capped array before oldest is evicted */
export const USER_ACTIVITY_CAPS = {
  RECENTLY_VIEWED: 50,
  SEARCH_HISTORY: 50,
  CLICK_HISTORY: 100,
  BROWSING_HISTORY: 50,
} as const;

export const UserActivitySchema = z.object({
  _id: z.string(), // userId — one doc per user

  // Browsing histories (capped arrays, newest first)
  recentlyViewed: z.array(RecentlyViewedEntrySchema).default([]),
  searchHistory: z.array(SearchHistoryEntrySchema).default([]),
  clickHistory: z.array(ClickHistoryEntrySchema).default([]),
  browsingHistory: z.array(BrowsingHistoryEntrySchema).default([]),

  // Product/order references (just IDs for referential integrity)
  wishlist: z.array(z.string()).default([]),
  cart: z.array(z.string()).default([]),
  orders: z.array(z.string()).default([]),
  purchases: z.array(z.string()).default([]),

  // Interest scores (categoryId/brandName → weight)
  categoryInterests: z.record(z.string(), z.number()).default({}),
  brandInterests: z.record(z.string(), z.number()).default({}),

  // Price preference range (inferred from browsing/purchase history)
  pricePreferences: PricePreferencesSchema.default({ min: 0, max: 0 }),

  // Session & device info
  device: z.string().default(''),
  sessionDuration: z.number().min(0).default(0), // cumulative seconds
  lastActive: z.date(),

  // Preferred lists (derived from top-N interests)
  preferredCategories: z.array(z.string()).default([]),
  preferredBrands: z.array(z.string()).default([]),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserActivity = z.infer<typeof UserActivitySchema>;

export const CreateUserActivityInputSchema = UserActivitySchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateUserActivityInput = z.infer<typeof CreateUserActivityInputSchema>;

// ──────────────────────────────────────────
// Reviews Schema — collection: reviews
// ──────────────────────────────────────────

export const ReviewSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  review: z.string().min(1).max(5000),
  images: z.array(z.string().url()).default([]),
  verifiedPurchase: z.boolean().default(false),
  helpfulCount: z.number().int().min(0).default(0),
  reportCount: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Review = z.infer<typeof ReviewSchema>;

export const CreateReviewInputSchema = ReviewSchema.omit({
  _id: true,
  helpfulCount: true,
  reportCount: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateReviewInput = z.infer<typeof CreateReviewInputSchema>;

export const UpdateReviewInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  review: z.string().min(1).max(5000).optional(),
  images: z.array(z.string().url()).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});
export type UpdateReviewInput = z.infer<typeof UpdateReviewInputSchema>;

// ──────────────────────────────────────────
// Recommendation Cache Schema — collection: recommendation_cache
// Stores pre-computed recommendations for fast serving
// ──────────────────────────────────────────

export const RecommendationTypeSchema = z.enum([
  'personalized',   // Tailored for a specific user
  'similar',        // "Similar to this product"
  'trending',       // Trending across the platform
  'popular',        // Overall popular products
  'recently_viewed', // "You viewed these"
  'related',        // Related to item in cart
  'category_top',   // Top in a category
]);
export type RecommendationType = z.infer<typeof RecommendationTypeSchema>;

export const RecommendationCacheSchema = z.object({
  _id: z.string(),
  userId: z.string().nullable().default(null), // null = anonymous
  type: RecommendationTypeSchema,
  productIds: z.array(z.string()),
  scores: z.array(z.number()),
  context: z
    .object({
      categoryId: z.string().optional(),
      productId: z.string().optional(), // source productId (for similar/related)
    })
    .optional(),
  expiresAt: z.date(), // TTL index drives automatic cleanup
  computedAt: z.date(),
});

export type RecommendationCache = z.infer<typeof RecommendationCacheSchema>;

export const CreateRecommendationCacheInputSchema = RecommendationCacheSchema.omit({
  _id: true,
  computedAt: true,
});
export type CreateRecommendationCacheInput = z.infer<typeof CreateRecommendationCacheInputSchema>;

// ──────────────────────────────────────────
// Raw Event Types (for analytics-tracking pipeline)
// These are append-only event stores, aggregated into product_analytics.
// ──────────────────────────────────────────

export const ProductViewEventSchema = z.object({
  _id: z.string(),
  productId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.date(),
  source: z.enum(['direct', 'search', 'category', 'recommendation', 'related']).optional(),
});
export type ProductViewEvent = z.infer<typeof ProductViewEventSchema>;

export const ProductClickEventSchema = z.object({
  _id: z.string(),
  productId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.date(),
  context: z.enum(['search', 'category', 'recommendation', 'cart', 'checkout']).optional(),
});
export type ProductClickEvent = z.infer<typeof ProductClickEventSchema>;

export const SearchQuerySchema = z.object({
  _id: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  query: z.string(),
  resultCount: z.number().int().min(0).optional(),
  timestamp: z.date(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const PRODUCT_VIEWS_COLLECTION = 'product_views';
export const PRODUCT_CLICKS_COLLECTION = 'product_clicks';
export const SEARCH_QUERIES_COLLECTION = 'search_queries';

// ──────────────────────────────────────────
// MongoDB metadata — Collections
// ──────────────────────────────────────────

export const PRODUCT_ANALYTICS_COLLECTION = 'product_analytics';
export const USER_ACTIVITY_COLLECTION = 'user_activity';
export const REVIEWS_COLLECTION = 'reviews';
export const RECOMMENDATION_CACHE_COLLECTION = 'recommendation_cache';

// ──────────────────────────────────────────
// MongoDB metadata — Indexes
// ──────────────────────────────────────────

export const PRODUCT_ANALYTICS_INDEXES = [
  // _id is productId — automatically indexed by MongoDB
  // Trending queries: filtered by recency, sorted by trending score
  { key: { trendingScore: -1, lastViewedAt: -1 } },
  // Popularity queries
  { key: { popularityScore: -1 } },
  // Recently active products (for time-decay recalculation jobs)
  { key: { updatedAt: -1 } },
] as const;

export const USER_ACTIVITY_INDEXES = [
  // Primary lookup by userId (already _id)
  // Last-active queries for batch jobs
  { key: { lastActive: -1 } },
  // Interests — for finding users with shared interests
  { key: { 'preferredCategories': 1 } },
  { key: { 'preferredBrands': 1 } },
] as const;

export const REVIEWS_INDEXES = [
  // Lookup by productId, sorted by helpfulness then date
  { key: { productId: 1, helpfulCount: -1, createdAt: -1 } },
  // Lookup by productId sorted by date only
  { key: { productId: 1, createdAt: -1 } },
  // Lookup by userId
  { key: { userId: 1, createdAt: -1 } },
  // Prevent duplicate reviews (one review per user per product)
  { key: { userId: 1, productId: 1 }, unique: true },
] as const;

export const RECOMMENDATION_CACHE_INDEXES = [
  // User + type lookup (primary access pattern)
  { key: { userId: 1, type: 1 } },
  // Type-only queries (trending, popular for anonymous users)
  { key: { type: 1, expiresAt: -1 } },
  // Context queries — find "similar to product X"
  { key: { 'context.productId': 1, type: 1 } },
  // TTL index: expire documents after expiresAt
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
] as const;

// ──────────────────────────────────────────
// Validation rules (JSON Schema / MongoDB validator)
// ──────────────────────────────────────────

export const PRODUCT_ANALYTICS_VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['totalViews', 'trendingScore', 'popularityScore', 'createdAt', 'updatedAt'],
    properties: {
      totalViews: { bsonType: 'int', minimum: 0 },
      uniqueViews: { bsonType: 'int', minimum: 0 },
      productClicks: { bsonType: 'int', minimum: 0 },
      addToCartCount: { bsonType: 'int', minimum: 0 },
      removeFromCartCount: { bsonType: 'int', minimum: 0 },
      wishlistCount: { bsonType: 'int', minimum: 0 },
      purchases: { bsonType: 'int', minimum: 0 },
      orderCount: { bsonType: 'int', minimum: 0 },
      searchCount: { bsonType: 'int', minimum: 0 },
      shareCount: { bsonType: 'int', minimum: 0 },
      avgTimeSpent: { bsonType: 'double', minimum: 0 },
      bounceRate: { bsonType: 'double', minimum: 0, maximum: 1 },
      conversionRate: { bsonType: 'double', minimum: 0, maximum: 1 },
      productRating: { bsonType: 'double', minimum: 0, maximum: 5 },
      ratingCount: { bsonType: 'int', minimum: 0 },
      reviewCount: { bsonType: 'int', minimum: 0 },
      trendingScore: { bsonType: 'double' },
      popularityScore: { bsonType: 'double' },
    },
  },
};

export const REVIEWS_VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'productId', 'rating', 'title', 'review', 'createdAt', 'updatedAt'],
    properties: {
      userId: { bsonType: 'string' },
      productId: { bsonType: 'string' },
      rating: { bsonType: 'int', minimum: 1, maximum: 5 },
      title: { bsonType: 'string', maxLength: 200 },
      review: { bsonType: 'string', maxLength: 5000 },
      verifiedPurchase: { bsonType: 'bool' },
      helpfulCount: { bsonType: 'int', minimum: 0 },
      reportCount: { bsonType: 'int', minimum: 0 },
    },
  },
};

export const RECOMMENDATION_CACHE_VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['type', 'productIds', 'expiresAt', 'computedAt'],
    properties: {
      userId: { bsonType: ['string', 'null'] },
      type: {
        enum: ['personalized', 'similar', 'trending', 'popular', 'recently_viewed', 'related', 'category_top'],
      },
      productIds: { bsonType: 'array', items: { bsonType: 'string' } },
      scores: { bsonType: 'array', items: { bsonType: 'double' } },
      expiresAt: { bsonType: 'date' },
      computedAt: { bsonType: 'date' },
    },
  },
};
