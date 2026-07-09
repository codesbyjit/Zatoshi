'use client';

import { useTheme } from '@/components/ThemeProvider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TimeRange } from '@/components/analytics/TimeRangeSelector';

interface RevenueDataPoint {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  range?: TimeRange;
}

function formatDateLabel(iso: string, range: TimeRange): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (range === '1d') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function rangeLabel(range: TimeRange): string {
  const labels: Record<TimeRange, string> = {
    '1d': 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
  };
  return labels[range];
}

export function RevenueChart({ data, range = '30d' }: RevenueChartProps) {
  const { theme } = useTheme();

  const chartData = data.map((d) => ({
    date: formatDateLabel(d.date, range),
    revenue: d.revenue,
  }));

  if (chartData.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Revenue</h3>
        <div className="h-[300px] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          No revenue data available
        </div>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#18181b' : '#fff',
    border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  };

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Revenue ({rangeLabel(range)})</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--color-accent)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
