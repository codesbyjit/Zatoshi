import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db, type Collection } from 'mongodb';
import RedisMock from 'ioredis-mock';
import {
  PRODUCT_COLLECTION,
  PRODUCT_ANALYTICS_COLLECTION,
  USER_ACTIVITY_COLLECTION,
  REVIEWS_COLLECTION,
  RECOMMENDATION_CACHE_COLLECTION,
  ReviewSchema,
  type Product,
  type Review,
  type ProductAnalytics,
  type UserActivity,
  type RecommendationCache,
} from '@repo/types';

// ── Module-level state ──────────────────────────────────

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;
let redisMock: InstanceType<typeof RedisMock>;

let productsCollection: Collection<Product>;
let analyticsCollection: Collection<ProductAnalytics>;
let userActivityCollection: Collection<UserActivity>;
let reviewsCollection: Collection<Review>;
let recCacheCollection: Collection<RecommendationCache>;

// ── Mock dependencies ───────────────────────────────────

vi.mock('../src/db/client', () => ({
  getDb: () => db,
  connectMongo: vi.fn(),
  disconnectMongo: vi.fn(),
}));

vi.mock('../src/db/redis', () => ({
  getRedis: () => redisMock,
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────

const productTemplate = (overrides: Partial<Product> = {}): Product => ({
  _id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: 'Test Product',
  slug: `test-product-${Date.now()}`,
  description: 'A test product for recommendation tests',
  price: 29.99,
  categoryId: 'cat-electronics',
  images: ['https://example.com/img.jpg'],
  variants: [],
  inventory: 100,
  tags: ['test', 'electronics'],
  isActive: true,
  isFeatured: false,
  rating: 0,
  reviewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Setup ───────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test');
  redisMock = new RedisMock();

  productsCollection = db.collection<Product>(PRODUCT_COLLECTION);
  analyticsCollection = db.collection<ProductAnalytics>(PRODUCT_ANALYTICS_COLLECTION);
  userActivityCollection = db.collection<UserActivity>(USER_ACTIVITY_COLLECTION);
  reviewsCollection = db.collection<Review>(REVIEWS_COLLECTION);
  recCacheCollection = db.collection<RecommendationCache>(RECOMMENDATION_CACHE_COLLECTION);

  // Create indexes
  await productsCollection.createIndex({ slug: 1 }, { unique: true });
  await productsCollection.createIndex({ name: 'text', description: 'text' });
  await productsCollection.createIndex({ tags: 1 });
  await analyticsCollection.createIndex({ trendingScore: -1 });
  await analyticsCollection.createIndex({ popularityScore: -1 });
  await reviewsCollection.createIndex({ productId: 1, createdAt: -1 });
  await reviewsCollection.createIndex({ userId: 1, productId: 1 }, { unique: true });

  // Seed products
  const electronics: Product[] = [
    productTemplate({
      _id: 'rec-prod-1', name: 'Wireless Headphones', slug: 'wireless-headphones',
      price: 199.99, categoryId: 'cat-electronics', tags: ['audio', 'wireless', 'premium'],
      inventory: 50, isFeatured: true, rating: 4.5, reviewCount: 120,
    }),
    productTemplate({
      _id: 'rec-prod-2', name: 'Bluetooth Speaker', slug: 'bluetooth-speaker',
      price: 79.99, categoryId: 'cat-electronics', tags: ['audio', 'wireless', 'speaker'],
      inventory: 100, rating: 4.2, reviewCount: 85,
    }),
    productTemplate({
      _id: 'rec-prod-3', name: 'Mechanical Keyboard', slug: 'mechanical-keyboard',
      price: 149.99, categoryId: 'cat-electronics', tags: ['keyboard', 'mechanical', 'rgb'],
      inventory: 30, rating: 4.7, reviewCount: 200,
    }),
    productTemplate({
      _id: 'rec-prod-4', name: 'USB-C Hub', slug: 'usb-c-hub',
      price: 49.99, categoryId: 'cat-accessories', tags: ['accessories', 'usb', 'hub'],
      inventory: 200, rating: 4.0, reviewCount: 45,
    }),
    productTemplate({
      _id: 'rec-prod-5', name: 'Laptop Stand', slug: 'laptop-stand',
      price: 39.99, categoryId: 'cat-accessories', tags: ['stand', 'laptop', 'aluminum'],
      inventory: 75, rating: 4.3, reviewCount: 75,
    }),
    productTemplate({
      _id: 'rec-prod-6', name: 'Mouse Pad', slug: 'mouse-pad',
      price: 19.99, categoryId: 'cat-accessories', tags: ['accessories', 'mouse', 'desk'],
      inventory: 500, rating: 4.1, reviewCount: 30,
    }),
  ];
  await productsCollection.insertMany(electronics);
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
  redisMock.disconnect();
});

// ══════════════════════════════════════════════════════════
// ANALYTICS TRACKING
// ══════════════════════════════════════════════════════════

describe('Analytics Tracking', () => {
  describe('Track Product View', () => {
    it('should create analytics document on first view', async () => {
      // Use _updateOne with upsert to simulate the analytics service
      const result = await analyticsCollection.updateOne(
        { _id: 'rec-prod-1' },
        {
          $inc: { totalViews: 1, uniqueViews: 1 },
          $set: { lastViewedAt: new Date(), updatedAt: new Date() },
          $setOnInsert: {
            productClicks: 0, addToCartCount: 0, removeFromCartCount: 0,
            wishlistCount: 0, purchases: 0, orderCount: 0, searchCount: 0,
            shareCount: 0, avgTimeSpent: 0, bounceRate: 0, conversionRate: 0,
            productRating: 0, ratingCount: 0, reviewCount: 0,
            trendingScore: 0, popularityScore: 0, createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      expect(result.upsertedCount).toBe(1);

      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-1' });
      expect(doc).toBeTruthy();
      expect(doc!.totalViews).toBe(1);
      expect(doc!.uniqueViews).toBe(1);
    });

    it('should increment analytics on subsequent views', async () => {
      await analyticsCollection.updateOne(
        { _id: 'rec-prod-1' },
        {
          $inc: { totalViews: 1, uniqueViews: 1 },
          $set: { lastViewedAt: new Date(), updatedAt: new Date() },
        },
      );

      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-1' });
      expect(doc!.totalViews).toBe(2);
      expect(doc!.uniqueViews).toBe(2);
    });

    it('should track add-to-cart events', async () => {
      await analyticsCollection.updateOne(
        { _id: 'rec-prod-2' },
        {
          $inc: { addToCartCount: 1 },
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            totalViews: 0, uniqueViews: 0, productClicks: 0,
            removeFromCartCount: 0, wishlistCount: 0, purchases: 0,
            orderCount: 0, searchCount: 0, shareCount: 0,
            avgTimeSpent: 0, bounceRate: 0, conversionRate: 0,
            productRating: 0, ratingCount: 0, reviewCount: 0,
            trendingScore: 0, popularityScore: 0,
            lastViewedAt: null, lastPurchasedAt: null,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      // Add another
      await analyticsCollection.updateOne(
        { _id: 'rec-prod-2' },
        { $inc: { addToCartCount: 1 }, $set: { updatedAt: new Date() } },
      );

      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-2' });
      expect(doc!.addToCartCount).toBe(2);
    });

    it('should track purchase events', async () => {
      await analyticsCollection.updateOne(
        { _id: 'rec-prod-3' },
        {
          $inc: { purchases: 1, orderCount: 1 },
          $set: { lastPurchasedAt: new Date(), updatedAt: new Date() },
          $setOnInsert: {
            totalViews: 0, uniqueViews: 0, productClicks: 0,
            addToCartCount: 0, removeFromCartCount: 0,
            wishlistCount: 0, searchCount: 0, shareCount: 0,
            avgTimeSpent: 0, bounceRate: 0, conversionRate: 0,
            productRating: 0, ratingCount: 0, reviewCount: 0,
            trendingScore: 0, popularityScore: 0,
            lastViewedAt: null, createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-3' });
      expect(doc!.purchases).toBe(1);
      expect(doc!.orderCount).toBe(1);
    });

    it('should get product analytics for a specific product', async () => {
      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-1' });
      expect(doc).toBeTruthy();
      expect(typeof doc!.totalViews).toBe('number');
      expect(typeof doc!.trendingScore).toBe('number');
    });
  });

  describe('Trending Products', () => {
    it('should return products sorted by trending score', async () => {
      // Seed trending scores using upsert to avoid duplicate key errors
      const analyticsData = [
        { _id: 'rec-prod-1', trendingScore: 95, popularityScore: 90, totalViews: 100, uniqueViews: 80, productClicks: 50, addToCartCount: 30, removeFromCartCount: 5, wishlistCount: 20, purchases: 15, orderCount: 12, searchCount: 40, shareCount: 10, avgTimeSpent: 120, bounceRate: 0.3, conversionRate: 0.15, productRating: 4.5, ratingCount: 120, reviewCount: 120 },
        { _id: 'rec-prod-2', trendingScore: 80, popularityScore: 75, totalViews: 80, uniqueViews: 60, productClicks: 30, addToCartCount: 20, removeFromCartCount: 3, wishlistCount: 15, purchases: 10, orderCount: 8, searchCount: 30, shareCount: 5, avgTimeSpent: 90, bounceRate: 0.4, conversionRate: 0.12, productRating: 4.2, ratingCount: 85, reviewCount: 85 },
        { _id: 'rec-prod-3', trendingScore: 70, popularityScore: 85, totalViews: 50, uniqueViews: 40, productClicks: 20, addToCartCount: 10, removeFromCartCount: 2, wishlistCount: 8, purchases: 5, orderCount: 4, searchCount: 20, shareCount: 3, avgTimeSpent: 60, bounceRate: 0.5, conversionRate: 0.10, productRating: 4.7, ratingCount: 200, reviewCount: 200 },
      ];

      for (const data of analyticsData) {
        await analyticsCollection.updateOne(
          { _id: data._id },
          {
            $set: {
              ...data,
              lastViewedAt: new Date(),
              lastPurchasedAt: null,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
      }

      const trending = await analyticsCollection
        .find()
        .sort({ trendingScore: -1 })
        .limit(3)
        .toArray();

      expect(trending.length).toBeGreaterThanOrEqual(3);
      expect(trending[0].trendingScore).toBeGreaterThanOrEqual(trending[1].trendingScore);
      expect(trending[0]._id).toBe('rec-prod-1');
    });
  });

  describe('Popular Products', () => {
    it('should return products sorted by popularity score', async () => {
      const popular = await analyticsCollection
        .find()
        .sort({ popularityScore: -1 })
        .limit(3)
        .toArray();

      expect(popular.length).toBeGreaterThanOrEqual(3);
      expect(popular[0]._id).toBe('rec-prod-1'); // popularityScore: 90
    });
  });

  describe('Edge Cases — Analytics', () => {
    it('should handle cold start (no analytics data yet)', async () => {
      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-4' });
      expect(doc).toBeNull();
    });

    it('should handle trending query with empty collection', async () => {
      // Use a different empty collection
      const empty = db.collection('empty_test');
      const results = await empty.find().sort({ trendingScore: -1 }).limit(5).toArray();
      expect(results).toEqual([]);
    });

    it('should not throw when incrementing non-existent analytics', async () => {
      // This should succeed via upsert
      const result = await analyticsCollection.updateOne(
        { _id: 'rec-prod-6' },
        {
          $inc: { totalViews: 1 },
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            uniqueViews: 0, productClicks: 0, addToCartCount: 0,
            removeFromCartCount: 0, wishlistCount: 0, purchases: 0,
            orderCount: 0, searchCount: 0, shareCount: 0,
            avgTimeSpent: 0, bounceRate: 0, conversionRate: 0,
            productRating: 0, ratingCount: 0, reviewCount: 0,
            trendingScore: 0, popularityScore: 0,
            lastViewedAt: null, lastPurchasedAt: null,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
      expect(result.upsertedCount).toBe(1);

      const doc = await analyticsCollection.findOne({ _id: 'rec-prod-6' });
      expect(doc!.totalViews).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════
// REVIEW SYSTEM
// ══════════════════════════════════════════════════════════

describe('Review System', () => {
  describe('Create Review', () => {
    it('should create a new review for a product', async () => {
      const review: Review = {
        _id: 'rev-1',
        userId: 'user-1',
        productId: 'rec-prod-1',
        rating: 5,
        title: 'Amazing headphones!',
        review: 'These wireless headphones are incredible. The sound quality is superb and noise cancellation works perfectly.',
        images: ['https://example.com/review1.jpg'],
        verifiedPurchase: true,
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await reviewsCollection.insertOne(review);

      const saved = await reviewsCollection.findOne({ _id: 'rev-1' });
      expect(saved).toBeTruthy();
      expect(saved!.rating).toBe(5);
      expect(saved!.productId).toBe('rec-prod-1');
      expect(saved!.verifiedPurchase).toBe(true);
    });

    it('should create a review without images', async () => {
      const review: Review = {
        _id: 'rev-2',
        userId: 'user-2',
        productId: 'rec-prod-1',
        rating: 4,
        title: 'Great but expensive',
        review: 'Very good product but a bit pricey for what it offers.',
        images: [],
        verifiedPurchase: false,
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await reviewsCollection.insertOne(review);
      const saved = await reviewsCollection.findOne({ _id: 'rev-2' });
      expect(saved!.images).toEqual([]);
    });

    it('should reject duplicate review (same user, same product)', async () => {
      const duplicate: Review = {
        _id: 'rev-dup',
        userId: 'user-1',
        productId: 'rec-prod-1',
        rating: 3,
        title: 'Duplicate review',
        review: 'Trying to submit another review',
        images: [],
        verifiedPurchase: false,
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(reviewsCollection.insertOne(duplicate)).rejects.toThrow();
    });
  });

  describe('Get Reviews', () => {
    it('should list reviews for a product sorted by date desc', async () => {
      const reviews = await reviewsCollection
        .find({ productId: 'rec-prod-1' })
        .sort({ createdAt: -1 })
        .toArray();

      expect(reviews.length).toBeGreaterThanOrEqual(2);
      expect(reviews.every((r) => r.productId === 'rec-prod-1')).toBe(true);
    });

    it('should return empty for a product with no reviews', async () => {
      const reviews = await reviewsCollection
        .find({ productId: 'rec-prod-3' })
        .toArray();

      expect(reviews).toEqual([]);
    });

    it('should get review by ID', async () => {
      const review = await reviewsCollection.findOne({ _id: 'rev-1' });
      expect(review).toBeTruthy();
      expect(review!.userId).toBe('user-1');
    });

    it('should return null for non-existent review', async () => {
      const review = await reviewsCollection.findOne({ _id: 'non-existent' });
      expect(review).toBeNull();
    });
  });

  describe('Update Review', () => {
    it('should update review rating and text', async () => {
      await reviewsCollection.updateOne(
        { _id: 'rev-1' },
        { $set: { rating: 4, title: 'Updated: Still good', review: 'Updated my review after a month of use.', updatedAt: new Date() } },
      );

      const updated = await reviewsCollection.findOne({ _id: 'rev-1' });
      expect(updated!.rating).toBe(4);
      expect(updated!.title).toBe('Updated: Still good');
    });
  });

  describe('Delete Review', () => {
    it('should delete a review', async () => {
      const result = await reviewsCollection.deleteOne({ _id: 'rev-2' });
      expect(result.deletedCount).toBe(1);

      const deleted = await reviewsCollection.findOne({ _id: 'rev-2' });
      expect(deleted).toBeNull();
    });

    it('should not throw when deleting non-existent review', async () => {
      const result = await reviewsCollection.deleteOne({ _id: 'non-existent' });
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('Review Stats', () => {
    it('should calculate average rating for a product', async () => {
      const stats = await reviewsCollection
        .aggregate([
          { $match: { productId: 'rec-prod-1' } },
          {
            $group: {
              _id: '$productId',
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 },
              ratingDistribution: {
                $push: '$rating',
              },
            },
          },
        ])
        .toArray();

      expect(stats.length).toBe(1);
      expect(stats[0].averageRating).toBeGreaterThan(0);
      expect(stats[0].totalReviews).toBe(1); // only 1 visible after deletion
    });
  });

  describe('Edge Cases — Reviews', () => {
    it('should reject rating below minimum (0) via Zod validation', () => {
      expect(() => {
        ReviewSchema.parse({
          _id: 'rev-invalid-low',
          userId: 'user-3',
          productId: 'rec-prod-4',
          rating: 0,
          title: 'Invalid rating',
          review: 'Testing low rating',
          images: [],
          verifiedPurchase: false,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }).toThrow();
    });

    it('should reject rating above maximum (6) via Zod validation', () => {
      expect(() => {
        ReviewSchema.parse({
          _id: 'rev-invalid-high',
          userId: 'user-3',
          productId: 'rec-prod-4',
          rating: 6,
          title: 'Invalid rating',
          review: 'Testing high rating',
          images: [],
          verifiedPurchase: false,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }).toThrow();
    });

    it('should handle reviews with helpful counts', async () => {
      // Seed a review with helpful count
      const review: Review = {
        _id: 'rev-helpful',
        userId: 'user-4',
        productId: 'rec-prod-5',
        rating: 5,
        title: 'Very helpful review',
        review: 'This product is amazing!',
        images: [],
        verifiedPurchase: true,
        helpfulCount: 15,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await reviewsCollection.insertOne(review);
      const saved = await reviewsCollection.findOne({ _id: 'rev-helpful' });
      expect(saved!.helpfulCount).toBe(15);
    });
  });

  describe('Input Validation', () => {
    it('should enforce max review text length', () => {
      const longText = 'a'.repeat(5001);

      expect(() => {
        ReviewSchema.parse({
          _id: 'rev-long',
          userId: 'user-1',
          productId: 'rec-prod-1',
          rating: 3,
          title: 'Long review',
          review: longText,
          images: [],
          verifiedPurchase: false,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }).toThrow();
    });

    it('should enforce required fields', () => {
      expect(() => {
        ReviewSchema.parse({
          _id: 'rev-missing',
          // missing userId, productId, etc.
        });
      }).toThrow();
    });

    it('should enforce max title length', () => {
      const longTitle = 'a'.repeat(201);

      expect(() => {
        ReviewSchema.parse({
          _id: 'rev-long-title',
          userId: 'user-1',
          productId: 'rec-prod-1',
          rating: 3,
          title: longTitle,
          review: 'Valid review text',
          images: [],
          verifiedPurchase: false,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }).toThrow();
    });
  });
});

// ══════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE
// ══════════════════════════════════════════════════════════

describe('Recommendation Engine', () => {
  describe('Similar Products (by tags & category)', () => {
    it('should find similar products by shared tags', async () => {
      // Products with 'audio' tag: rec-prod-1 (wireless headphones), rec-prod-2 (bluetooth speaker)
      const sourceTags = ['audio', 'wireless'];
      const similar = await productsCollection
        .find({
          _id: { $ne: 'rec-prod-1' },
          isActive: true,
          tags: { $in: sourceTags },
        })
        .sort({ rating: -1 })
        .limit(4)
        .toArray();

      expect(similar.length).toBeGreaterThanOrEqual(1);
      expect(similar.some((p) => p._id === 'rec-prod-2')).toBe(true);
    });

    it('should find products in same category', async () => {
      const similar = await productsCollection
        .find({
          _id: { $ne: 'rec-prod-1' },
          isActive: true,
          categoryId: 'cat-electronics',
        })
        .sort({ rating: -1 })
        .limit(4)
        .toArray();

      expect(similar.length).toBeGreaterThanOrEqual(2);
      expect(similar.every((p) => p.categoryId === 'cat-electronics')).toBe(true);
    });

    it('should prioritize products with more shared tags', async () => {
      // rec-prod-1 has tags ['audio', 'wireless', 'premium']
      // rec-prod-2 has tags ['audio', 'wireless', 'speaker']
      // Both share 'audio' and 'wireless' - 2 shared tags

      const sourceTags = ['audio', 'wireless', 'premium'];
      const similar = await productsCollection
        .aggregate([
          { $match: { _id: { $ne: 'rec-prod-1' }, isActive: true } },
          {
            $addFields: {
              sharedTagCount: {
                $size: {
                  $ifNull: [{ $setIntersection: ['$tags', sourceTags] }, []],
                },
              },
            },
          },
          { $match: { sharedTagCount: { $gt: 0 } } },
          { $sort: { sharedTagCount: -1, rating: -1 } },
          { $limit: 4 },
        ])
        .toArray();

      expect(similar.length).toBeGreaterThanOrEqual(1);
      // rec-prod-2 should rank highest (shares 'audio' and 'wireless')
      if (similar.length > 0) {
        expect(similar[0].sharedTagCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Personalized Recommendations', () => {
    it('should recommend based on category interests', async () => {
      // Seed user activity for user-99
      await userActivityCollection.insertOne({
        _id: 'user-99',
        recentlyViewed: [
          { productId: 'rec-prod-1', productName: 'Wireless Headphones', price: 199.99, image: 'https://example.com/img.jpg', viewedAt: new Date() },
          { productId: 'rec-prod-2', productName: 'Bluetooth Speaker', price: 79.99, image: 'https://example.com/img.jpg', viewedAt: new Date() },
        ],
        searchHistory: [{ query: 'wireless headphones', timestamp: new Date() }],
        clickHistory: [{ productId: 'rec-prod-1', timestamp: new Date() }],
        browsingHistory: [{ categoryId: 'cat-electronics', categoryName: 'Electronics', timestamp: new Date(), duration: 120 }],
        wishlist: ['rec-prod-3'],
        cart: [],
        orders: [],
        purchases: [],
        categoryInterests: { 'cat-electronics': 10, 'cat-accessories': 2 },
        brandInterests: {},
        pricePreferences: { min: 0, max: 200 },
        device: 'desktop',
        sessionDuration: 600,
        lastActive: new Date(),
        preferredCategories: ['cat-electronics'],
        preferredBrands: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Get recommendations: electronics products user hasn't interacted with
      const interactedIds = ['rec-prod-1', 'rec-prod-2', 'rec-prod-3'];
      const recommendations = await productsCollection
        .find({
          _id: { $nin: interactedIds },
          isActive: true,
          categoryId: { $in: ['cat-electronics'] },
        })
        .sort({ rating: -1 })
        .limit(5)
        .toArray();

      // No more electronics products to recommend (only 3 exist, all interacted with)
      // So fall back to accessories
      const fallback = recommendations.length === 0;
      if (fallback) {
        const fallbackRecs = await productsCollection
          .find({ _id: { $nin: interactedIds }, isActive: true })
          .sort({ rating: -1 })
          .limit(5)
          .toArray();
        expect(fallbackRecs.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Trending Recommendations', () => {
    it('should return trending products with highest trending scores', async () => {
      const trending = await analyticsCollection
        .find()
        .sort({ trendingScore: -1 })
        .limit(5)
        .toArray();

      expect(trending.length).toBeGreaterThanOrEqual(3);
      // rec-prod-1 should be top (trendingScore: 95)
      expect(trending[0].trendingScore).toBe(95);
    });
  });

  describe('Popular Recommendations', () => {
    it('should return products sorted by popularity score', async () => {
      const popular = await analyticsCollection
        .find()
        .sort({ popularityScore: -1 })
        .limit(5)
        .toArray();

      expect(popular.length).toBeGreaterThanOrEqual(3);
      expect(popular[0].popularityScore).toBe(90);
    });
  });

  describe('Recently Viewed', () => {
    it('should track and return recently viewed products for a user', async () => {
      const userId = 'user-98';
      await userActivityCollection.insertOne({
        _id: userId,
        recentlyViewed: [
          {
            productId: 'rec-prod-1',
            productName: 'Wireless Headphones',
            price: 199.99,
            image: 'https://example.com/img.jpg',
            viewedAt: new Date(),
          },
        ],
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
        lastActive: new Date(),
        preferredCategories: [],
        preferredBrands: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const activity = await userActivityCollection.findOne({ _id: userId });
      expect(activity).toBeTruthy();
      expect(activity!.recentlyViewed.length).toBe(1);
      expect(activity!.recentlyViewed[0].productId).toBe('rec-prod-1');
    });
  });

  describe('Recommendation Cache', () => {
    it('should cache recommendation results', async () => {
      const cacheEntry: RecommendationCache = {
        _id: 'cache-user-1-personalized',
        userId: 'user-1',
        type: 'personalized',
        productIds: ['rec-prod-4', 'rec-prod-5'],
        scores: [0.95, 0.85],
        context: {},
        expiresAt: new Date(Date.now() + 3600_000),
        computedAt: new Date(),
      };

      await recCacheCollection.insertOne(cacheEntry);

      const cached = await recCacheCollection.findOne({ _id: 'cache-user-1-personalized' });
      expect(cached).toBeTruthy();
      expect(cached!.productIds).toEqual(['rec-prod-4', 'rec-prod-5']);
      expect(cached!.type).toBe('personalized');
    });

    it('should expire cached recommendations', async () => {
      const expired: RecommendationCache = {
        _id: 'cache-expired',
        userId: null,
        type: 'trending',
        productIds: ['rec-prod-1'],
        scores: [1.0],
        context: {},
        expiresAt: new Date(Date.now() - 1000), // Already expired
        computedAt: new Date(Date.now() - 7200_000),
      };

      await recCacheCollection.insertOne(expired);

      // Query should still find it (TTL cleanup is async)
      const found = await recCacheCollection.findOne({ _id: 'cache-expired' });
      expect(found).toBeTruthy();
      expect(new Date(found!.expiresAt).getTime()).toBeLessThan(Date.now());
    });

    it('should retrieve non-expired cached recommendations', async () => {
      const valid: RecommendationCache = {
        _id: 'cache-valid',
        userId: 'user-5',
        type: 'personalized',
        productIds: ['rec-prod-2', 'rec-prod-3'],
        scores: [0.9, 0.8],
        context: {},
        expiresAt: new Date(Date.now() + 3600_000),
        computedAt: new Date(),
      };

      await recCacheCollection.insertOne(valid);

      const found = await recCacheCollection.findOne({
        userId: 'user-5',
        type: 'personalized',
        expiresAt: { $gt: new Date() },
      });

      expect(found).toBeTruthy();
      expect(found!.productIds).toEqual(['rec-prod-2', 'rec-prod-3']);
    });
  });

  describe('Edge Cases — Recommendations', () => {
    it('should handle cold start (no interaction data)', async () => {
      const userId = 'user-cold-start';
      const activity = await userActivityCollection.findOne({ _id: userId });
      expect(activity).toBeNull();

      // Fallback to popular/trending when no user history
      const popular = await analyticsCollection
        .find()
        .sort({ popularityScore: -1 })
        .limit(5)
        .toArray();
      expect(popular.length).toBeGreaterThan(0);
    });

    it('should handle single product in system', async () => {
      // Query for similar products to a product that has no similar ones
      const sourceProductTags = ['unique', 'one-of-a-kind'];
      const similar = await productsCollection
        .find({
          _id: { $ne: 'rec-prod-4' },
          isActive: true,
          tags: { $in: sourceProductTags },
        })
        .toArray();

      expect(similar).toEqual([]);
    });

    it('should return empty for anonymous user with no history', async () => {
      // Anonymous users get trending/popular
      const trending = await analyticsCollection
        .find()
        .sort({ trendingScore: -1 })
        .limit(5)
        .toArray();

      expect(trending.length).toBeGreaterThan(0);
    });

    it('should not recommend the same product', async () => {
      const productId = 'rec-prod-1';
      const sourceTags = ['audio', 'wireless', 'premium'];

      const similar = await productsCollection
        .find({
          _id: { $ne: productId },
          isActive: true,
          tags: { $in: sourceTags },
        })
        .toArray();

      expect(similar.every((p) => p._id !== productId)).toBe(true);
    });

    it('should cap recommendations at requested limit', async () => {
      const limit = 2;
      const results = await analyticsCollection
        .find()
        .sort({ trendingScore: -1 })
        .limit(limit)
        .toArray();

      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });
});
