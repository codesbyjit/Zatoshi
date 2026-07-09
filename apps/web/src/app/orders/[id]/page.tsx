'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, getStatusVariant, resolveImageUrl } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { Order } from '@repo/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function OrderDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(
          `${API_URL}/trpc/order.getById?input=${encodeURIComponent(JSON.stringify({ id: params.id }))}`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        );
        const data = await res.json();
        setOrder(data?.result?.data || null);
      } catch {
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [user, authLoading, router, params.id]);

  if (authLoading || isLoading) {
    return (
      <div className="container-content py-8">
        <Skeleton variant="text" className="mb-4 h-8 w-64" />
        <Skeleton variant="card" className="h-48" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-content flex flex-col items-center justify-center py-16 text-center">
        <h1 className="text-h2 text-[var(--color-text-primary)]">Order Not Found</h1>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">This order could not be found.</p>
        <Link href="/orders" className="mt-6">
          <Button variant="primary" size="lg">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-content py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/orders" className="text-sm text-[var(--color-accent)] hover:underline">&larr; Back to Orders</Link>
          <h1 className="mt-2 text-h2 text-[var(--color-text-primary)]">
            Order #{order.orderNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
          <Badge variant={getStatusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge>
        </div>
      </div>

      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        Placed on {formatDate(order.createdAt)}
      </p>

      {/* Items */}
      <div className="mb-8 rounded-md border border-[var(--color-border)]">
        <h3 className="border-b border-[var(--color-border)] px-4 py-3 text-sm-medium text-[var(--color-text-primary)]">
          Items
        </h3>
        <div className="divide-y divide-[var(--color-border)]">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 px-4 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--color-bg-secondary)]">
                {item.image && (
                  <img src={resolveImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-medium text-[var(--color-text-primary)] truncate">{item.name}</p>
                {item.variantInfo && (
                  <p className="text-sm text-[var(--color-text-muted)]">{item.variantInfo}</p>
                )}
                <p className="text-sm text-[var(--color-text-muted)]">
                  {formatCurrency(item.price)} &times; {item.quantity}
                </p>
              </div>
              <p className="text-body-medium text-[var(--color-text-primary)]">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping */}
      <div className="mb-8 rounded-md border border-[var(--color-border)] p-4">
        <h3 className="mb-2 text-sm-medium text-[var(--color-text-primary)]">Shipping Address</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          <br />
          {order.shippingAddress.street}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
          <br />
          {order.shippingAddress.country}
        </p>
      </div>

      {/* Totals */}
      <div className="rounded-md bg-[var(--color-bg-secondary)] p-4">
        <div className="space-y-1 text-sm">
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
            <span className="text-h4 font-bold text-[var(--color-text-primary)]">Total</span>
            <span className="text-h4 font-bold text-[var(--color-text-primary)]">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
