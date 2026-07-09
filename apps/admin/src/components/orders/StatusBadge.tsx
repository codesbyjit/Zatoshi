'use client';

import { Badge } from '@/components/ui/Badge';
import type { OrderStatus, PaymentStatus } from '@repo/types';

const orderStatusVariant: Record<OrderStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

const paymentStatusVariant: Record<PaymentStatus, 'success' | 'warning' | 'error' | 'default'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'default',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={orderStatusVariant[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={paymentStatusVariant[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
