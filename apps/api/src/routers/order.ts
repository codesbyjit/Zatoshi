import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t, protectedProcedure, adminProcedure } from '../trpc/trpc';
import * as orderService from '../services/order.service';
import { OrderStatusSchema } from '@repo/types';

/**
 * Order router — customer create/list, admin list/update status.
 */
export const orderRouter = t.router({
  /**
   * Create a new order (customer).
   */
  create: protectedProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              productId: z.string().min(1),
              variantInfo: z.string().optional(),
              quantity: z.number().int().positive(),
            }),
          )
          .min(1),
        shippingAddress: z.object({
          firstName: z.string().min(1).max(50),
          lastName: z.string().min(1).max(50),
          street: z.string().min(1).max(200),
          city: z.string().min(1).max(100),
          state: z.string().min(1).max(100),
          zip: z.string().min(1).max(20),
          country: z.string().min(1).max(100),
          phone: z.string().min(1).max(20),
        }),
        idempotencyKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.userId;
      return orderService.createOrder(input, userId);
    }),

  /**
   * Get an order by ID (own order only).
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.userId;
      const isAdmin = ctx.user!.role === 'admin';
      const order = await orderService.getOrderById(input.id, userId, isAdmin);
      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }
      return order;
    }),

  /**
   * List the current customer's orders.
   */
  listMy: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.userId;
      return orderService.listMyOrders(userId, input as any);
    }),

  /**
   * Admin: list all orders with optional filters.
   */
  adminList: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        userId: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ input }) => {
      return orderService.adminListOrders(input as any);
    }),

  /**
   * Admin: update an order's status.
   */
  adminUpdateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: OrderStatusSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return orderService.adminUpdateOrderStatus(input.id, input.status);
    }),
});
