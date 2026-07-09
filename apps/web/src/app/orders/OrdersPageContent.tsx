'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, getStatusVariant, resolveImageUrl } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import type { Order } from '@repo/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function OrdersPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch(
          `${API_URL}/trpc/order.listMy?input=${encodeURIComponent(JSON.stringify({ page: 1, limit: 20 }))}`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        );
        const data = await res.json();
        setOrders(data?.result?.data?.items || []);
      } catch {
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="container-content py-8">
        <h1 className="mb-8 text-h2 text-[var(--color-text-primary)]">My Orders</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-[var(--color-border)] p-4">
              <Skeleton variant="text" className="mb-2 h-5 w-48" />
              <Skeleton variant="text" className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container-content py-8">
        <h1 className="mb-8 text-h2 text-[var(--color-text-primary)]">My Orders</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-[var(--color-text-muted)]" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-body-medium text-[var(--color-text-primary)]">No orders yet</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">When you place an order, it will appear here.</p>
          <Button variant="primary" size="lg" className="mt-6" onClick={() => router.push('/products')}>
            Start Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-content py-8">
      <h1 className="mb-8 text-h2 text-[var(--color-text-primary)]">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id}>
            <div
              className="flex cursor-pointer items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
              onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-caption text-[var(--color-text-muted)]">
                    #{order.orderNumber}
                  </span>
                  <Badge variant={getStatusVariant(order.status)} size="sm">
                    {order.status}
                  </Badge>
                  <Badge variant={getStatusVariant(order.paymentStatus)} size="sm">
                    {order.paymentStatus}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-body-medium text-[var(--color-text-primary)]">
                  {formatCurrency(order.total)}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`text-[var(--color-text-muted)] transition-transform duration-200 ${expandedOrder === order._id ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Expanded details */}
            {expandedOrder === order._id && (
              <div className="border-x border-b border-[var(--color-border)] rounded-b-md bg-[var(--color-bg-secondary)] p-4">
                <div className="space-y-2">
                  <h4 className="text-sm-medium text-[var(--color-text-primary)]">Items</h4>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-[var(--color-bg)]">
                        {item.image && (
                          <img src={resolveImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[var(--color-text-primary)] truncate">{item.name}</p>
                        <p className="text-[var(--color-text-muted)]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-[var(--color-text-primary)]">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Subtotal</span>
                    <span className="text-[var(--color-text-primary)]">{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Shipping</span>
                    <span className="text-[var(--color-text-primary)]">{order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Tax</span>
                    <span className="text-[var(--color-text-primary)]">{formatCurrency(order.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-border)] pt-1">
                    <span className="text-sm-medium text-[var(--color-text-primary)]">Total</span>
                    <span className="text-sm-medium text-[var(--color-text-primary)]">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href={`/orders/${order._id}`}>
                    <Button variant="secondary" size="sm">View Details</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
