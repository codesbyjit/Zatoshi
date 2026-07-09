'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { trpcCall } from '@/lib/trpc';
import type { TimeRange } from '@/components/analytics/TimeRangeSelector';

interface OrdersDataPoint {
  date: string;
  orders: number;
}

interface OrdersChartProps {
  range: TimeRange;
}

// ── Zero-fill utility ──────────────────────────────────────
// Fills in missing dates with orders = 0 so there are no gaps in the chart.

function zeroFillData(data: OrdersDataPoint[], range: TimeRange): OrdersDataPoint[] {
  if (data.length === 0) return [];

  const numDays: Record<TimeRange, number> = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  const days = numDays[range] ?? 30;

  // Parse all dates into Date objects, discarding invalid ones
  const parsed = data
    .map((d) => ({ orders: d.orders, dateObj: new Date(d.date) }))
    .filter((d) => !isNaN(d.dateObj.getTime()));

  if (parsed.length === 0) return data;

  // For 1d range, return data as-is (hourly granularity handled by backend)
  if (range === '1d') return data;

  // Determine the range boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(Math.max(...parsed.map((d) => d.dateObj.getTime())));
  const endDate = maxDate > today ? maxDate : today;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // Build lookup map: "YYYY-MM-DD" → orders
  const dataMap = new Map<string, number>();
  for (const d of parsed) {
    const key = d.dateObj.toISOString().slice(0, 10);
    dataMap.set(key, d.orders);
  }

  // Walk through every date and fill gaps
  const result: OrdersDataPoint[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({
      date: key,
      orders: dataMap.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

// ── Date label formatting ──────────────────────────────────

function formatDateLabel(iso: string, range: TimeRange): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (range === '1d') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function rangeHeading(range: TimeRange): string {
  const labels: Record<TimeRange, string> = {
    '1d': 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
  };
  return labels[range];
}

// ── Component ──────────────────────────────────────────────

export function OrdersChart({ range }: OrdersChartProps) {
  const { theme } = useTheme();
  const [data, setData] = useState<OrdersDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await trpcCall<{
          orders: OrdersDataPoint[];
          range: string;
          total: number;
          groupBy: 'hour' | 'day';
        }>('GET:analytics.salesChart', { range });
        if (!cancelled) {
          const filled = zeroFillData(result.orders, range);
          setData(filled);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load orders data',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // ── Shared tooltip style ────────────────────────────────

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#18181b' : '#fff',
    border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  };

  // ── Loading state ───────────────────────────────────────

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
          Orders ({rangeHeading(range)})
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────

  if (error) {
    return (
      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
          Orders ({rangeHeading(range)})
        </h3>
        <div className="h-[300px] flex items-center justify-center text-[var(--color-error)] text-sm">
          {error}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────

  if (data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
          Orders ({rangeHeading(range)})
        </h3>
        <div className="h-[300px] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          No order data available for this period
        </div>
      </div>
    );
  }

  // ── Chart ────────────────────────────────────────────────

  const chartData = data.map((d) => ({
    date: formatDateLabel(d.date, range),
    orders: d.orders,
  }));

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
        Orders ({rangeHeading(range)})
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              interval={range === '90d' ? 6 : range === '30d' ? 2 : 0}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [value, 'Orders']}
            />
            <Bar
              dataKey="orders"
              fill="var(--color-accent)"
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
