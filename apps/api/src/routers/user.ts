import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ObjectId } from 'mongodb';
import { t, adminProcedure } from '../trpc/trpc';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  USER_COLLECTION,
  ORDER_COLLECTION,
  UserRoleSchema,
  type User,
  type Order,
} from '@repo/types';

const logger = getLogger('api:user-router');

/**
 * Safe user type (without passwordHash) with optional orderCount.
 */
interface SafeUser {
  _id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  orderCount?: number;
}

const USER_PROJECTION = {
  projection: {
    passwordHash: 0,
  },
} as const;

/**
 * Convert a string ID to ObjectId if it matches MongoDB's 24-hex-char format.
 * This allows querying users seeded with ObjectIds as well as those created
 * as string UUIDs via `randomUUID()`.
 */
function toObjectId(id: string): ObjectId | string {
  if (/^[a-f0-9]{24}$/i.test(id)) {
    return new ObjectId(id);
  }
  return id;
}

/** Helper to build a filter match for `_id` that accepts both string and ObjectId. */
function idFilter(id: string): Record<string, unknown> {
  return { _id: toObjectId(id) };
}

/**
 * User management router — admin only.
 */
export const userRouter = t.router({
  /**
   * List all users with pagination, search, and role filter.
   * Admin only.
   */
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: UserRoleSchema.optional(),
        page: z.number().int().min(1).optional().default(1),
        limit: z.number().int().min(1).max(100).optional().default(20),
      }),
    )
    .query(async ({ input }): Promise<{
      items: SafeUser[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> => {
      const db = getDb();
      const users = db.collection<User>(USER_COLLECTION);
      const orders = db.collection<Order>(ORDER_COLLECTION);

      const { search, role, page = 1, limit = 20 } = input;
      const skip = (page - 1) * limit;

      // Build query filters
      const query: Record<string, unknown> = {};

      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
        ];
      }

      if (role) {
        query.role = role;
      }

      // Get total count and paginated results
      const [items, total] = await Promise.all([
        users
          .find(query, USER_PROJECTION)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        users.countDocuments(query),
      ]);

      // Aggregate order counts for the returned users
      const userIds = items.map((u) => u._id);
      let countMap = new Map<string, number>();

      if (userIds.length > 0) {
        const orderCounts = await orders
          .aggregate<{ _id: string; count: number }>([
            { $match: { userId: { $in: userIds } } },
            { $group: { _id: '$userId', count: { $sum: 1 } } },
          ])
          .toArray();

        countMap = new Map(orderCounts.map((o) => [o._id, o.count]));
      }

      const safeItems: SafeUser[] = items.map((u) => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        orderCount: countMap.get(u._id) ?? 0,
      }));

      return {
        items: safeItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Get a single user by ID (admin only).
   * Returns user details without passwordHash plus their recent orders.
   */
  getById: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        includeOrders: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ input }): Promise<{
      user: SafeUser;
      orders: Order[];
    }> => {
      const db = getDb();
      const users = db.collection<User>(USER_COLLECTION);
      const orders = db.collection<Order>(ORDER_COLLECTION);

      const user = await users.findOne(idFilter(input.id), USER_PROJECTION);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Fetch recent orders if requested
      let recentOrders: Order[] = [];

      if (input.includeOrders) {
        recentOrders = await orders
          .find({ userId: input.id })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
      }

      const safeUser: SafeUser = {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return {
        user: safeUser,
        orders: recentOrders,
      };
    }),

  /**
   * Update a user's role (admin only).
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: UserRoleSchema,
      }),
    )
    .mutation(async ({ input }): Promise<SafeUser> => {
      const db = getDb();
      const users = db.collection<User>(USER_COLLECTION);

      const result = await users.findOneAndUpdate(
        idFilter(input.userId),
        { $set: { role: input.role, updatedAt: new Date() } },
        { returnDocument: 'after', projection: { passwordHash: 0 } },
      );

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      logger.info(
        { userId: input.userId, newRole: input.role },
        'User role updated',
      );

      return {
        _id: result._id,
        email: result.email,
        name: result.name,
        role: result.role,
        avatarUrl: result.avatarUrl,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    }),

  /**
   * Soft-delete a user (admin only).
   * Sets deletedAt timestamp instead of removing the document.
   */
  delete: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }): Promise<{ success: boolean }> => {
      const db = getDb();
      const users = db.collection<User>(USER_COLLECTION);

      const now = new Date();

      const result = await users.updateOne(
        idFilter(input.userId),
        { $set: { deletedAt: now, updatedAt: now } },
      );

      if (result.matchedCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      logger.info({ userId: input.userId }, 'User soft-deleted');

      return { success: true };
    }),
});
