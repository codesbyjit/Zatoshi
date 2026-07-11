import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { t, publicProcedure, protectedProcedure } from '../trpc/trpc';
import * as recService from '../services/recommendation.service';

/**
 * Reviews router — create, read, update, delete reviews, plus helpful/report.
 */
export const reviewsRouter = t.router({
  /**
   * Create a review for a product.
   */
  create: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        title: z.string().min(1).max(200),
        review: z.string().min(1).max(5000),
        images: z.array(z.string().url()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId;
      return recService.createReview({
        userId,
        productId: input.productId,
        rating: input.rating,
        title: input.title,
        review: input.review,
        images: input.images,
        verifiedPurchase: false,
      });
    }),

  /**
   * Update an existing review.
   */
  update: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().min(1),
        rating: z.number().int().min(1).max(5).optional(),
        title: z.string().min(1).max(200).optional(),
        review: z.string().min(1).max(5000).optional(),
        images: z.array(z.string().url()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return recService.updateReview(input.reviewId, ctx.user.userId, {
        title: input.title,
        review: input.review,
        images: input.images,
        rating: input.rating,
      });
    }),

  /**
   * Delete a review.
   */
  delete: protectedProcedure
    .input(z.object({ reviewId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await recService.deleteReview(input.reviewId, ctx.user.userId);
      return { success: true };
    }),

  /**
   * Get reviews for a product with pagination and sorting.
   */
  getByProduct: publicProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        sortBy: z
          .enum(['helpful', 'newest', 'oldest', 'highest', 'lowest'])
          .optional()
          .default('newest'),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ input }) => {
      return recService.getReviewsByProduct(input.productId, {
        sortBy: input.sortBy,
        page: input.page,
        limit: input.limit,
      });
    }),

  /**
   * Get the current user's reviews.
   */
  getByUser: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      return recService.getReviewsByUser(ctx.user.userId, input.page, input.limit);
    }),

  /**
   * Mark a review as helpful.
   */
  markHelpful: publicProcedure
    .input(z.object({ reviewId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await recService.markReviewHelpful(input.reviewId);
      return { success: true };
    }),

  /**
   * Report a review.
   */
  report: publicProcedure
    .input(z.object({ reviewId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await recService.reportReview(input.reviewId);
      return { success: true };
    }),
});
