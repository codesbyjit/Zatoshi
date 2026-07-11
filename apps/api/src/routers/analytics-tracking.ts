import { z } from 'zod';
import { t, publicProcedure, protectedProcedure } from '../trpc/trpc';
import * as analyticsService from '../services/analytics-tracking.service';

/**
 * Analytics tracking router — records user behavior events.
 * These procedures are called by the frontend to track
 * product views, clicks, searches, and cart actions.
 */
export const analyticsTrackingRouter = t.router({
  /**
   * Track a product page view (public — uses sessionId for anonymous users).
   */
  trackView: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        sessionId: z.string().optional(),
        source: z
          .enum(['search', 'category', 'recommendation', 'direct', 'related'])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await analyticsService.trackProductView(input.productId, {
        userId: ctx.user?.userId,
        sessionId: input.sessionId,
        source: input.source,
      });
      return { success: true };
    }),

  /**
   * Track a product click (add-to-cart button, product card click, etc.).
   */
  trackClick: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        sessionId: z.string().optional(),
        context: z
          .enum(['search', 'category', 'recommendation', 'cart', 'checkout'])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await analyticsService.trackProductClick(input.productId, {
        userId: ctx.user?.userId,
        sessionId: input.sessionId,
        context: input.context,
      });
      return { success: true };
    }),

  /**
   * Track a search query (public — uses sessionId for anonymous users).
   */
  trackSearch: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        sessionId: z.string().optional(),
        resultCount: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await analyticsService.trackSearch(input.query, {
        userId: ctx.user?.userId,
        sessionId: input.sessionId,
        resultCount: input.resultCount,
      });
      return { success: true };
    }),

  /**
   * Track an add-to-cart event.
   */
  trackAddToCart: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await analyticsService.trackAddToCart(input.productId, {
        userId: ctx.user.userId,
        sessionId: input.sessionId,
      });
      return { success: true };
    }),

  /**
   * Get the current session ID (for anonymous tracking continuity).
   */
  getSessionId: publicProcedure.query(() => {
    const { randomUUID } = require('node:crypto');
    return { sessionId: randomUUID() };
  }),
});
