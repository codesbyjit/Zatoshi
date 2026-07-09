import { z } from 'zod';
import { t, adminProcedure } from '../trpc/trpc';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  ORDER_COLLECTION,
  PRODUCT_COLLECTION,
  USER_COLLECTION,
} from '@repo/types';

const logger = getLogger('api:analytics-router');

// ─── Types ────────────────────────────────────────

const RangeSchema = z.enum(['1d', '7d', '30d', '90d']);
type Range = z.infer<typeof RangeSchema>;

interface OrderPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface SalesChartResponse {
  orders: OrderPoint[];
  range: Range;
  total: number;
  groupBy: 'hour' | 'day';
}

// ─── Range configuration ──────────────────────────

const RANGE_CONFIG: Record<
  Range,
  { days: number; groupBy: 'hour' | 'day'; mongoFormat: string }
> = {
  '1d': { days: 1, groupBy: 'hour', mongoFormat: '%Y-%m-%dT%H:00:00' },
  '7d': { days: 7, groupBy: 'day', mongoFormat: '%Y-%m-%d' },
  '30d': { days: 30, groupBy: 'day', mongoFormat: '%Y-%m-%d' },
  '90d': { days: 90, groupBy: 'day', mongoFormat: '%Y-%m-%d' },
};

// ─── Zero-fill helpers ────────────────────────────

/**
 * Format a UTC date as a grouping key, matching MongoDB's $dateToString output.
 */
function formatDateKey(date: Date, groupBy: 'hour' | 'day'): string {
  if (groupBy === 'hour') {
    return date.toISOString().slice(0, 13) + ':00:00';
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Increment a Date by one time slot in UTC.
 */
function incrementSlot(date: Date, groupBy: 'hour' | 'day'): void {
  if (groupBy === 'hour') {
    date.setUTCHours(date.getUTCHours() + 1);
  } else {
    date.setUTCDate(date.getUTCDate() + 1);
  }
}

/**
 * Zero-fill MongoDB aggregation results so that every time slot
 * in the requested range is present in the output (with 0 orders
 * and 0 revenue for empty slots).
 */
function zeroFillOrders(
  dbResults: Array<{ date: string; revenue: number; orders: number }>,
  range: Range,
): SalesChartResponse {
  const config = RANGE_CONFIG[range];
  const now = new Date();
  const start = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);

  // Floor the start cursor to the beginning of its time unit
  if (config.groupBy === 'hour') {
    start.setUTCMinutes(0, 0, 0);
  } else {
    start.setUTCHours(0, 0, 0, 0);
  }

  // Build a lookup map from the aggregation results
  const resultMap = new Map(dbResults.map((r) => [r.date, r]));

  // Generate every time slot in the range
  const orders: OrderPoint[] = [];
  const cursor = new Date(start);

  while (cursor <= now) {
    const key = formatDateKey(cursor, config.groupBy);
    const existing = resultMap.get(key);
    orders.push({
      date: key,
      orders: existing?.orders ?? 0,
      revenue: existing?.revenue ?? 0,
    });
    incrementSlot(cursor, config.groupBy);
  }

  const total = orders.reduce((sum, o) => sum + o.orders, 0);

  return {
    orders,
    range,
    total,
    groupBy: config.groupBy,
  };
}

/**
 * Analytics router — admin-only dashboard data.
 * Provides overview stats, sales charts, top products, and recent orders.
 */
export const analyticsRouter = t.router({
  /**
   * Overview dashboard statistics.
   */
  overview: adminProcedure.query(async () => {
    const db = getDb();
    const orders = db.collection(ORDER_COLLECTION);
    const products = db.collection(PRODUCT_COLLECTION);
    const users = db.collection(USER_COLLECTION);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Total revenue from non-cancelled orders
    const [revenueAgg] = await orders
      .aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ])
      .toArray();
    const totalRevenue = revenueAgg?.total ?? 0;

    // Revenue today
    const [revenueTodayAgg] = await orders
      .aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
            createdAt: { $gte: todayStart },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ])
      .toArray();
    const revenueToday = revenueTodayAgg?.total ?? 0;

    // Products sold (sum of all items.quantity in non-cancelled orders)
    const [soldAgg] = await orders
      .aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: null, total: { $sum: '$items.quantity' } } },
      ])
      .toArray();
    const productsSold = soldAgg?.total ?? 0;

    const [ordersToday, ordersTotal, activeProducts, totalUsers] =
      await Promise.all([
        orders.countDocuments({ createdAt: { $gte: todayStart } }),
        orders.countDocuments(),
        products.countDocuments({ isActive: true }),
        users.countDocuments({ role: { $ne: 'admin' } }),
      ]);

    logger.debug(
      {
        totalRevenue,
        ordersToday,
        ordersTotal,
        productsSold,
        activeProducts,
        totalUsers,
      },
      'analytics.overview',
    );

    return {
      totalRevenue,
      ordersToday,
      ordersTotal,
      productsSold,
      activeProducts,
      totalUsers,
      revenueToday,
      revenueGrowth: 0,
    };
  }),

  /**
   * Sales chart data — revenue and order counts over a time range, zero-filled.
   *
   * Accepts a `range` parameter (`1d`, `7d`, `30d`, `90d`, default `30d`).
   * For `1d`, results are grouped by hour; for longer ranges, by day.
   * Every time slot in the range is present — days/hours without orders
   * return 0 for both `orders` and `revenue`.
   */
  salesChart: adminProcedure
    .input(
      z.object({
        range: RangeSchema.default('30d'),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const orders = db.collection(ORDER_COLLECTION);
      const config = RANGE_CONFIG[input.range];

      const now = new Date();
      const startDate = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);

      const results = await orders
        .aggregate([
          {
            $match: {
              status: { $ne: 'cancelled' },
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: config.mongoFormat, date: '$createdAt' },
              },
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
        ])
        .toArray();

      return zeroFillOrders(
        results as Array<{ date: string; revenue: number; orders: number }>,
        input.range,
      );
    }),

  /**
   * Top selling products by quantity sold.
   */
  topProducts: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const orders = db.collection(ORDER_COLLECTION);

      const results = await orders
        .aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              totalQuantity: { $sum: '$items.quantity' },
              totalRevenue: {
                $sum: { $multiply: ['$items.price', '$items.quantity'] },
              },
            },
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: input.limit },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              productId: '$_id',
              name: { $ifNull: ['$product.name', 'Unknown'] },
              totalQuantity: 1,
              totalRevenue: 1,
            },
          },
        ])
        .toArray();

      return results;
    }),

  /**
   * Recent orders with user info for the dashboard.
   */
  recentOrders: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const orders = db.collection(ORDER_COLLECTION);

      const results = await orders
        .aggregate([
          { $sort: { createdAt: -1 } },
          { $limit: input.limit },
          {
            $lookup: {
              from: 'users',
              let: { uid: '$userId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [{ $toString: '$_id' }, { $toString: '$$uid' }],
                    },
                  },
                },
              ],
              as: 'user',
            },
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: { $toString: '$_id' },
              orderNumber: 1,
              userId: 1,
              userName: { $ifNull: ['$user.name', 'Unknown'] },
              userEmail: { $ifNull: ['$user.email', ''] },
              total: 1,
              status: 1,
              createdAt: 1,
              itemCount: { $size: '$items' },
            },
          },
        ])
        .toArray();

      return results;
    }),
});
