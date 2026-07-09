'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { OrderTable } from '@/components/orders/OrderTable';
import { getTRPCClient } from '@/lib/trpc';
import type { OrderStatus, PaymentStatus } from '@repo/types';

export default function OrdersPage() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = 10;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // Fetch orders from API when page, statusFilter, or auth state changes
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const api = getTRPCClient();
    api
      .query<any>('order.adminList', {
        page,
        limit: pageSize,
        status: statusFilter || undefined,
      })
      .then((result) => {
        setOrders(result.items || []);
        setTotal(result.total || 0);
      })
      .catch((err) => console.error('Failed to fetch orders:', err))
      .finally(() => setLoading(false));
  }, [page, statusFilter, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Client-side search filter on fetched data (keeps existing functionality)
  const filtered = orders.filter((o) => {
    if (search && !o.orderNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Map API orders to table-compatible format
  const tableOrders = filtered.map((o) => ({
    id: o._id,
    orderNumber: o.orderNumber,
    customerName:
      o.customerName ||
      (o.shippingAddress
        ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}`
        : 'N/A'),
    date: o.createdAt
      ? new Date(o.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'N/A',
    itemCount: o.items?.length || 0,
    total: o.total || 0,
    paymentStatus: o.paymentStatus as PaymentStatus,
    status: o.status as OrderStatus,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Orders</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{total} total</p>
      </div>

      <OrderTable
        orders={tableOrders}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={setSearch}
        onStatusFilter={setStatusFilter}
        isLoading={loading}
      />
    </div>
  );
}
