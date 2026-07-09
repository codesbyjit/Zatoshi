import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:trpc');

/**
 * tRPC instance with error formatting for consistent error responses.
 */
export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    logger.debug(
      {
        code: error.code,
        message: error.message,
        path: shape.data?.path,
      },
      'tRPC error',
    );

    return {
      ...shape,
      data: {
        ...shape.data,
        // In production, don't leak internal error details
        ...(process.env.NODE_ENV === 'production'
          ? { stack: undefined }
          : {}),
      },
    };
  },
});

/**
 * Public procedure — no authentication required.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires a valid JWT token.
 * Throws UNAUTHORIZED if user is not authenticated.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Admin procedure — requires admin role.
 * Throws FORBIDDEN if user is not an admin.
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
