'use client';

import { formatCurrency, getShippingCost, getTax, resolveImageUrl } from '@/lib/utils';
import type { CartItemData } from '@/components/cart/CartItem';
import type { ShippingAddressData } from './ShippingForm';

interface OrderReviewProps {
  items: CartItemData[];
  shippingAddress?: ShippingAddressData;
  paymentMethod?: string;
}

export function OrderSummary({ items, shippingAddress, paymentMethod }: OrderReviewProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = getShippingCost(subtotal);
  const tax = getTax(subtotal);
  const total = subtotal + shipping + tax;

  return (
    <div className="space-y-6">
      <h2 className="text-h2 text-[var(--color-text-primary)]">Review Your Order</h2>

      {/* Items */}
      <div>
        <h3 className="mb-3 text-sm-medium text-[var(--color-text-primary)]">Items</h3>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-[var(--color-bg-secondary)]">
                {item.image && (
                  <img src={resolveImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm-medium text-[var(--color-text-primary)] truncate">{item.name}</p>
                {item.variantInfo && (
                  <p className="text-xs text-[var(--color-text-muted)]">{item.variantInfo}</p>
                )}
                <p className="text-sm text-[var(--color-text-muted)]">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm text-[var(--color-text-primary)]">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      {shippingAddress && (
        <div>
          <h3 className="mb-1 text-sm-medium text-[var(--color-text-primary)]">Shipping To</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {shippingAddress.firstName} {shippingAddress.lastName}
            <br />
            {shippingAddress.street}
            <br />
            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
            <br />
            {shippingAddress.country}
          </p>
        </div>
      )}

      {/* Payment */}
      {paymentMethod && (
        <div>
          <h3 className="mb-1 text-sm-medium text-[var(--color-text-primary)]">Payment</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{paymentMethod}</p>
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-[var(--color-border)] pt-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Subtotal</span>
            <span className="text-[var(--color-text-primary)]">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Shipping</span>
            <span className="text-[var(--color-text-primary)]">
              {shipping === 0 ? 'Free' : formatCurrency(shipping)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Tax</span>
            <span className="text-[var(--color-text-primary)]">{formatCurrency(tax)}</span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-1">
            <div className="flex justify-between">
              <span className="text-h4 font-bold text-[var(--color-text-primary)]">Total</span>
              <span className="text-h4 font-bold text-[var(--color-text-primary)]">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
