import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t, publicProcedure, adminProcedure } from '../trpc/trpc';
import * as productService from '../services/product.service';

/**
 * Product router — public list/get, admin create/update/delete.
 */
export const productRouter = t.router({
  /**
   * List products with pagination, filtering, and search.
   */
  list: publicProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        minPrice: z.number().positive().optional(),
        maxPrice: z.number().positive().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
        includeInactive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      return productService.listProducts(input);
    }),

  /**
   * Get a product by its slug.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const product = await productService.getProductBySlug(input.slug);
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return product;
    }),

  /**
   * Get a product by its ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const product = await productService.getProductById(input.id);
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return product;
    }),

  /**
   * Create a new product (admin only).
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(250),
        description: z.string().max(5000),
        price: z.number().positive().multipleOf(0.01),
        compareAtPrice: z.number().positive().multipleOf(0.01).optional(),
        categoryId: z.string(),
        images: z.array(z.union([z.string().url(), z.string().startsWith('/')])),
        variants: z.array(
          z.object({
            name: z.string().min(1).max(100),
            sku: z.string().min(1).max(50),
            price: z.number().positive().multipleOf(0.01).optional(),
            inventory: z.number().int().min(0),
          }),
        ),
        inventory: z.number().int().min(0),
        tags: z.array(z.string().max(50)),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        rating: z.number().min(0).max(5).default(0),
        reviewCount: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ input }) => {
      return productService.createProduct(input);
    }),

  /**
   * Update a product (admin only).
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: z.object({
          name: z.string().min(1).max(200).optional(),
          slug: z.string().min(1).max(250).optional(),
          description: z.string().max(5000).optional(),
          price: z.number().positive().multipleOf(0.01).optional(),
          compareAtPrice: z.number().positive().multipleOf(0.01).optional(),
          categoryId: z.string().optional(),
          images: z.array(z.union([z.string().url(), z.string().startsWith('/')])).optional(),
          variants: z
            .array(
              z.object({
                name: z.string().min(1).max(100),
                sku: z.string().min(1).max(50),
                price: z.number().positive().multipleOf(0.01).optional(),
                inventory: z.number().int().min(0),
              }),
            )
            .optional(),
          inventory: z.number().int().min(0).optional(),
          tags: z.array(z.string().max(50)).optional(),
          isActive: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          rating: z.number().min(0).max(5).optional(),
          reviewCount: z.number().int().min(0).optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      return productService.updateProduct(input.id, input.data);
    }),

  /**
   * Delete a product (admin only).
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await productService.deleteProduct(input.id);
      return { success: true };
    }),
});
