import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t, publicProcedure, adminProcedure } from '../trpc/trpc';
import * as categoryService from '../services/category.service';

/**
 * Category router — public list/get, admin create/update/delete.
 */
export const categoryRouter = t.router({
  /**
   * List all categories.
   */
  list: publicProcedure.query(async () => {
    return categoryService.listCategories();
  }),

  /**
   * Get a category by ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const category = await categoryService.getCategoryById(input.id);
      if (!category) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }
      return category;
    }),

  /**
   * Create a new category (admin only).
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(150),
        description: z.string().max(500).optional(),
        imageUrl: z.string().url().optional(),
        parentId: z.string().optional(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ input }) => {
      return categoryService.createCategory(input);
    }),

  /**
   * Update a category (admin only).
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: z.object({
          name: z.string().min(1).max(100).optional(),
          slug: z.string().min(1).max(150).optional(),
          description: z.string().max(500).optional(),
          imageUrl: z.string().url().optional(),
          parentId: z.string().optional(),
          sortOrder: z.number().int().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      return categoryService.updateCategory(input.id, input.data);
    }),

  /**
   * Delete a category (admin only).
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await categoryService.deleteCategory(input.id);
      return { success: true };
    }),
});
