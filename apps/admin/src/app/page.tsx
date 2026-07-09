'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OrdersChart } from '@/components/dashboard/OrdersChart';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { Button } from '@/components/ui/Button';
import { TimeRangeSelector } from '@/components/analytics/TimeRangeSelector';
import type { TimeRange } from '@/components/analytics/TimeRangeSelector';
import Link from 'next/link';
import { trpcCall } from '@/lib/trpc';

// ── API response types ──────────────────────────────────────

interface OverviewData {
  totalRevenue: number;
  ordersToday: number;
  ordersTotal: number;
  productsSold: number;
  activeProducts: number;
  totalUsers: number;
  revenueToday: number;
  revenueGrowth: number;
}

interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface RecentOrderItem {
  _id: string;
  orderNumber: string;
  userName: string;
  userEmail: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface TrendInfo {
  value: number;
  isUp: boolean;
}

function computeTrend(current: number, previous: number): TrendInfo {
  if (previous === 0) return { value: current > 0 ? 100 : 0, isUp: current > 0 };
  const pct = ((current - previous) / previous) * 100;
  return { value: Math.abs(Math.round(pct * 10) / 10), isUp: pct >= 0 };
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  // ── Data states ────────────────────────────────────────────
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrderItem[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [range, setRange] = useState<TimeRange>('30d');

  const [error, setError] = useState<string | null>(null);

  // ── Fetch data ─────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await trpcCall<OverviewData>('GET:analytics.overview');
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchSalesChart = useCallback(async () => {
    setLoadingSales(true);
    try {
      const data = await trpcCall<{
        orders: SalesPoint[];
        range: string;
        total: number;
        groupBy: 'hour' | 'day';
      }>('GET:analytics.salesChart', { range });
      setSalesData(data.orders);
    } catch {
      // Non-critical — allow dashboard to render without chart
      setLoadingSales(false);
    } finally {
      setLoadingSales(false);
    }
  }, [range]);

  const fetchRecentOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await trpcCall<RecentOrderItem[]>(
        'GET:analytics.recentOrders',
        { limit: 10 },
      );
      setRecentOrders(data);
    } catch {
      // Non-critical
      setLoadingOrders(false);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOverview();
      fetchSalesChart();
      fetchRecentOrders();
    }
  }, [isAuthenticated, fetchOverview, fetchSalesChart, fetchRecentOrders]);

  // ── Auth guard ─────────────────────────────────────────────
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Prepare chart data (raw dates; RevenueChart formats by range) ──
  const chartRevenueData = salesData.map((d) => ({
    date: d.date,
    revenue: d.revenue,
  }));

  // ── Transform recent orders for the component ──────────────
  const recentOrderList = recentOrders.map((o) => ({
    id: o._id,
    orderNumber: o.orderNumber,
    customerName: o.userName,
    date: formatDate(o.createdAt),
    status: o.status as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
    total: o.total,
  }));

  // ── Trend computation ──────────────────────────────────────
  // Compute previous period revenue (double the period for comparison)
  const prevPeriodRevenue = overview ? overview.totalRevenue - overview.revenueToday : 0;
  const revenueTrend = overview ? computeTrend(overview.revenueToday, prevPeriodRevenue / 29) : { value: 0, isUp: true };

  const ordersTrend = overview
    ? computeTrend(overview.ordersToday, (overview.ordersTotal - overview.ordersToday) / 29)
    : { value: 0, isUp: true };

  const productsTrend = overview
    ? computeTrend(overview.activeProducts, 0)
    : { value: 0, isUp: true };

  const usersTrend = overview
    ? computeTrend(overview.totalUsers, 0)
    : { value: 0, isUp: true };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Overview of your store performance</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-sm bg-[var(--color-error-bg)] border border-[var(--color-border)] p-3 text-sm text-[var(--color-error)]">
          {error}
          <button
            onClick={() => {
              setError(null);
              fetchOverview();
              fetchSalesChart();
              fetchRecentOrders();
            }}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Revenue"
          value={loadingOverview ? '...' : overview ? formatCurrency(overview.totalRevenue) : '-'}
          trend={revenueTrend}
        />
        <StatsCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Total Orders"
          value={loadingOverview ? '...' : overview ? formatCompact(overview.ordersTotal) : '-'}
          trend={ordersTrend}
        />
        <StatsCard
          icon={<Package className="h-5 w-5" />}
          label="Active Products"
          value={loadingOverview ? '...' : overview ? formatCompact(overview.activeProducts) : '-'}
          trend={productsTrend}
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={loadingOverview ? '...' : overview ? formatCompact(overview.totalUsers) : '-'}
          trend={usersTrend}
        />
      </div>

      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <div />
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loadingSales ? (
          <div className="card p-6">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Revenue</h3>
            <div className="h-[300px] flex items-center justify-center">
              <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <RevenueChart data={chartRevenueData} range={range} />
        )}
        <OrdersChart range={range} />
      </div>

      {/* Recent orders */}
      {loadingOrders ? (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Recent Orders</h3>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : (
        <RecentOrders orders={recentOrderList} />
      )}

      {/* Quick actions */}
      <div className="card p-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/products/new">
            <Button variant="primary">Add Product</Button>
          </Link>
          <Link href="/orders">
            <Button variant="secondary">View All Orders</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
