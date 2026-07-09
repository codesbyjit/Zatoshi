'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { OrderStatus } from '@repo/types';

interface RecentOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string;
  status: OrderStatus;
  total: number;
}

interface RecentOrdersProps {
  orders: RecentOrderItem[];
}

const statusVariant: Record<OrderStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Recent Orders</h3>
        <Link
          href="/orders"
          className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-sm text-[var(--color-text-muted)] text-center py-8">No orders yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-primary)]">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{order.customerName}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{order.date}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[order.status]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-[var(--color-text-primary)]">
                    ${order.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
