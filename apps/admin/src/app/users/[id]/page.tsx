'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { trpcCall } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Mail, Calendar, ShoppingBag, Shield } from 'lucide-react';
import Link from 'next/link';
import type { OrderStatus } from '@repo/types';

// ──────────────────────────────────────────
// API types
// ──────────────────────────────────────────

interface ApiUser {
  _id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiOrder {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  total: number;
  paymentStatus: string;
  createdAt: Date;
}

interface ApiUserDetailResponse {
  user: ApiUser;
  orders: ApiOrder[];
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function formatDate(raw: Date | string): string {
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(raw: Date | string): string {
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-[var(--color-warning)] bg-[var(--color-warning-bg)] border-[var(--color-warning-bg)]',
  confirmed: 'text-[var(--color-info)] bg-[var(--color-info-bg)] border-[var(--color-info-bg)]',
  processing: 'text-[#7c3aed] bg-[#f5f3ff] border-[#ddd6fe]',
  shipped: 'text-[#0891b2] bg-[#ecfeff] border-[#a5f3fc]',
  delivered: 'text-[var(--color-success)] bg-[var(--color-success-bg)] border-[var(--color-success-bg)]',
  cancelled: 'text-[var(--color-error)] bg-[var(--color-error-bg)] border-[var(--color-error-bg)]',
};

export default function UserDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();

  const userId = params.id as string;

  const [user, setUser] = useState<ApiUser | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const result = await trpcCall<ApiUserDetailResponse>(
        'GET:user.getById',
        { id: userId, includeOrders: true },
      );
      setUser(result.user);
      setOrders(result.orders || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load user';
      if (msg.includes('NOT_FOUND') || msg.includes('not found')) {
        setNotFound(true);
      } else {
        setError(msg);
        addToast({ title: 'Error', message: msg, variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, addToast]);

  useEffect(() => {
    if (isAuthenticated && userId) fetchUser();
  }, [isAuthenticated, userId, fetchUser]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="card p-12 text-center">
          <p className="text-lg font-medium text-[var(--color-text-primary)]">User not found</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            The user you are looking for does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <div className="p-3 rounded-sm bg-[var(--color-error-bg)] border border-[var(--color-border)] text-sm text-[var(--color-error)]">
          {error}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {/* User Profile Card */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-text-inverse)] text-2xl font-bold flex-shrink-0">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{user.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(user.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  <Badge variant={user.role === 'admin' ? 'accent' : 'default'}>
                    {user.role === 'admin' ? 'Admin' : 'Customer'}
                  </Badge>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  {orders.length} orders
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="card">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Order History</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--color-text-muted)]">
            This user has not placed any orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order._id}`}
                        className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_COLORS[order.status] || 'text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border-[var(--color-border)]'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-[var(--color-text-primary)]">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        variant={
                          order.paymentStatus === 'paid'
                            ? 'success'
                            : order.paymentStatus === 'pending'
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {order.paymentStatus.charAt(0).toUpperCase() +
                          order.paymentStatus.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
