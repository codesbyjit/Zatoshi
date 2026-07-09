'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { useToast } from '@/components/ui/Toast';
import { getTRPCClient } from '@/lib/trpc';
import type { OrderStatus } from '@repo/types';

export default function OrderDetailPage() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  const id = params?.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // Fetch order details from API
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    setFetching(true);
    const api = getTRPCClient();
    api
      .query<any>('order.getById', { id })
      .then((result) => {
        setOrder(result);

        // Build timeline from API statusHistory if available,
        // otherwise derive a simple timeline from createdAt/updatedAt
        if (result.statusHistory && result.statusHistory.length > 0) {
          setTimeline(result.statusHistory);
        } else {
          const formatDate = (d: string | Date) =>
            new Date(d).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
          const entries = [{ status: 'pending' as OrderStatus, timestamp: result.createdAt ? formatDate(result.createdAt) : 'N/A', note: 'Order placed' }];
          if (result.status !== 'pending') {
            entries.push({ status: result.status as OrderStatus, timestamp: result.updatedAt ? formatDate(result.updatedAt) : 'N/A', note: 'Current status' });
          }
          setTimeline(entries);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch order:', err);
        addToast({ title: 'Error', message: 'Failed to load order details', variant: 'error' });
      })
      .finally(() => setFetching(false));
  }, [id, isAuthenticated, addToast]);

  const handleStatusUpdate = async (status: OrderStatus) => {
    const api = getTRPCClient();
    try {
      await api.mutate('order.adminUpdateStatus', { id, status });
      addToast({
        title: 'Status updated',
        message: `Order status changed to ${status}`,
        variant: 'success',
      });
      // Refresh order details
      const result = await api.query<any>('order.getById', { id });
      setOrder(result);
    } catch (err: any) {
      addToast({
        title: 'Error',
        message: err?.message || 'Failed to update status',
        variant: 'error',
      });
    }
  };

  const handleCancel = async () => {
    const api = getTRPCClient();
    try {
      await api.mutate('order.adminUpdateStatus', { id, status: 'cancelled' });
      addToast({
        title: 'Order cancelled',
        message: 'The order has been cancelled.',
        variant: 'success',
      });
      // Refresh order details
      const result = await api.query<any>('order.getById', { id });
      setOrder(result);
    } catch (err: any) {
      addToast({
        title: 'Error',
        message: err?.message || 'Failed to cancel order',
        variant: 'error',
      });
    }
  };

  // Auth loading state
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Order fetching state
  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Order not found
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[var(--color-text-muted)]">Order not found</p>
        <button
          onClick={() => router.push('/orders')}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          Back to orders
        </button>
      </div>
    );
  }

  // Build the enriched order object the OrderDetail component expects
  const enrichedOrder = {
    ...order,
    customerName:
      order.customerName ||
      (order.shippingAddress
        ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
        : 'N/A'),
    customerEmail: order.customerEmail || '',
    items: order.items || [],
    shippingAddress: order.shippingAddress || {
      firstName: '',
      lastName: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      phone: '',
    },
  };

  return (
    <OrderDetail
      order={enrichedOrder}
      timeline={timeline}
      onStatusUpdate={handleStatusUpdate}
      onCancel={handleCancel}
    />
  );
}
