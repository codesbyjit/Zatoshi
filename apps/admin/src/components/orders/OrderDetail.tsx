'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge, PaymentStatusBadge } from './StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChevronDown, Clock } from 'lucide-react';
import type { Order, OrderItem, OrderStatus, ShippingAddress } from '@repo/types';

interface StatusTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

interface OrderDetailProps {
  order: Order & {
    customerName: string;
    customerEmail: string;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
  };
  timeline: StatusTimelineEntry[];
  onStatusUpdate: (status: OrderStatus) => Promise<void>;
  onCancel: () => Promise<void>;
}

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
];

export function OrderDetail({ order, timeline, onStatusUpdate, onCancel }: OrderDetailProps) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      await onStatusUpdate(newStatus as OrderStatus);
      setNewStatus('');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await onCancel();
      setCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] font-mono">{order.orderNumber}</h2>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input-field w-40"
                >
                  <option value="">Update Status</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStatusUpdate}
                  loading={updating}
                  disabled={!newStatus}
                >
                  Update
                </Button>
              </div>
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                Cancel Order
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order info + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Items</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Variant</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">{item.variantInfo || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">${item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Status Timeline</h3>
            <div className="space-y-0">
              {timeline.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-4 relative">
                  {/* Timeline dot & line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 mt-1 ${
                      idx === 0 ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'bg-[var(--color-card)] border-[var(--color-border)]'
                    }`} />
                    {idx < timeline.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[var(--color-border)] mt-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mt-0.5">
                      <Clock className="h-3 w-3" />
                      {entry.timestamp}
                    </div>
                    {entry.note && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar: Customer & totals */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Customer</h3>
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-primary)]">{order.customerName}</p>
              <p className="text-sm text-[var(--color-accent)]">{order.customerEmail}</p>
            </div>
          </div>

          {/* Shipping address */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Shipping Address</h3>
            <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
              <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="text-[var(--color-text-muted)]">{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Order totals */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Order Total</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Shipping</span>
                <span>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-[var(--color-border)]">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel confirmation */}
      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${order.orderNumber}? This action cannot be undone.`}
        confirmLabel="Cancel Order"
        isLoading={cancelling}
      />
    </div>
  );
}
