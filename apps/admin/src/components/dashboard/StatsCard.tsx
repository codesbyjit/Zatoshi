'use client';

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  trend: { value: number; isUp: boolean };
}

export function StatsCard({ icon, label, value, trend }: StatsCardProps) {
  return (
    <div className="card p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-md bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {trend.isUp ? (
            <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[var(--color-error)]" />
          )}
          <span className={`text-xs font-medium ${trend.isUp ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
            {trend.value}%
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">vs last month</span>
        </div>
      </div>
    </div>
  );
}
