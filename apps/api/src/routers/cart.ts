import { z } from 'zod';
import { t, protectedProcedure } from '../trpc/trpc';
import * as cartService from '../services/cart.service';

/**
 * Cart router — protected endpoints for managing the shopping cart.
 */
export const cartRouter = t.router({
  /**
   * Get the current user's cart.
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user!.userId;
    return cartService.getCart(userId);
  }),

  /**
   * Add an item to the cart.
   */
  addItem: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        variantInfo: z.string().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.userId;
      const cart = await cartService.getCart(userId);
      return cartService.addCartItem(cart._id, input);
    }),

  /**
   * Update the quantity of an item in the cart.
   */
  updateQuantity: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        variantInfo: z.string().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.userId;
      const cart = await cartService.getCart(userId);
      return cartService.updateCartItemQuantity(
        cart._id,
        input.productId,
        input.quantity,
        input.variantInfo,
      );
    }),

  /**
   * Remove an item from the cart.
   */
  removeItem: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1),
        variantInfo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.userId;
      const cart = await cartService.getCart(userId);
      return cartService.removeCartItem(
        cart._id,
        input.productId,
        input.variantInfo,
      );
    }),

  /**
   * Clear all items from the cart.
   */
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user!.userId;
    const cart = await cartService.getCart(userId);
    return cartService.clearCart(cart._id);
  }),

  /**
   * Get the number of items in the cart (sum of quantities).
   */
  getItemCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user!.userId;
    const cart = await cartService.getCart(userId);
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return { count };
  }),
});
