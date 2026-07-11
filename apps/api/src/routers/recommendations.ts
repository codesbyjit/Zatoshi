import { z } from 'zod';
import { t, publicProcedure, protectedProcedure } from '../trpc/trpc';
import { getDb } from '../db/client';
import {
  PRODUCT_COLLECTION,
  USER_ACTIVITY_COLLECTION,
  type Product,
  type UserActivity,
} from '@repo/types';
import * as recService from '../services/recommendation.service';

const DEFAULT_LIMIT = 10;

/**
 * Recommendations router — personalized, similar products, trending, etc.
 */
export const recommendationsRouter = t.router({
  /**
   * Get personalized recommendations for the authenticated user.
   */
  getPersonalized: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ ctx, input }) => {
      return recService.getPersonalizedRecommendations(ctx.user.userId, input.limit);
    }),

  /**
   * Get products similar to a given product.
   */
  getSimilar: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      return recService.getSimilarProducts(input.productId, input.limit);
    }),

  /**
   * Get frequently bought together products.
   */
  getFrequentlyBoughtTogether: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      return recService.getFrequentlyBoughtTogether(input.productId, input.limit);
    }),

  /**
   * Get "Customers Also Bought" products.
   */
  getCustomersAlsoBought: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      return recService.getFrequentlyBoughtTogether(input.productId, input.limit);
    }),

  /**
   * Get trending products.
   */
  getTrending: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      const trending = await recService.getTrendingProducts(input.limit);
      const ids = trending.map((t) => t._id);
      return recService.getProductsByIds(ids);
    }),

  /**
   * Get best-selling products.
   */
  getBestSellers: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      return recService.getPopularProducts(input.limit);
    }),

  /**
   * Get new arrivals.
   */
  getNewArrivals: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const products = db.collection<Product>(PRODUCT_COLLECTION);
      return products
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(input.limit)
        .toArray();
    }),

  /**
   * Get continue browsing recommendations.
   */
  getContinueBrowsing: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewed = await recService.getRecentlyViewedProducts(ctx.user.userId, 3);
      const seen = new Set(viewed.map((v) => v._id));
      const similarIds = new Set<string>();

      for (const product of viewed) {
        const similar = await recService.getSimilarProducts(product._id, input.limit);
        for (const s of similar) {
          if (!seen.has(s._id)) {
            similarIds.add(s._id);
          }
        }
        if (similarIds.size >= input.limit) break;
      }

      return recService.getProductsByIds([...similarIds].slice(0, input.limit));
    }),

  /**
   * Get recently viewed products.
   */
  getRecentlyViewed: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ ctx, input }) => {
      return recService.getRecentlyViewedProducts(ctx.user.userId, input.limit);
    }),

  /**
   * Get cart-based recommendations.
   */
  getCartRecommendations: publicProcedure
    .input(
      z.object({
        productIds: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      const ids = input.productIds;
      if (!ids || ids.length === 0) {
        return recService.getPopularProducts(input.limit);
      }
      return recService.getRelatedProducts(ids, input.limit);
    }),

  /**
   * Get wishlist-based recommendations.
   */
  getWishlistRecommendations: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const activity = await db
        .collection<UserActivity>(USER_ACTIVITY_COLLECTION)
        .findOne({ _id: ctx.user.userId as any });
      const wishlistIds = activity?.wishlist || [];
      if (!wishlistIds.length) return recService.getPopularProducts(input.limit);
      return recService.getRelatedProducts(wishlistIds.slice(0, 10), input.limit);
    }),

  /**
   * Get search-based recommendations.
   */
  getSearchRecommendations: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(50).optional().default(DEFAULT_LIMIT),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const products = db.collection<Product>(PRODUCT_COLLECTION);
      return products
        .find(
          { $text: { $search: input.query }, isActive: true },
          { projection: { score: { $meta: 'textScore' } } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(input.limit)
        .toArray();
    }),
});
