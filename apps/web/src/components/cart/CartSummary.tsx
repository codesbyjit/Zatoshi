import { formatCurrency, getShippingCost, getTax, isFreeShipping } from '@/lib/utils';

interface CartSummaryProps {
  subtotal: number;
  showCheckoutButton?: boolean;
}

export function CartSummary({ subtotal, showCheckoutButton = true }: CartSummaryProps) {
  const shipping = getShippingCost(subtotal);
  const tax = getTax(subtotal);
  const total = subtotal + shipping + tax;
  const freeShippingEligible = isFreeShipping(subtotal);

  return (
    <div className="rounded-md bg-[var(--color-bg-secondary)] p-4">
      <h3 className="mb-3 text-sm-medium text-[var(--color-text-primary)]">Order Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-secondary)]">Subtotal</span>
          <span className="text-[var(--color-text-primary)]">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-secondary)]">Shipping</span>
          <span
            className={
              freeShippingEligible
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-text-primary)]'
            }
          >
            {shipping === 0 ? 'Free' : formatCurrency(shipping)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-secondary)]">Tax (8%)</span>
          <span className="text-[var(--color-text-primary)]">{formatCurrency(tax)}</span>
        </div>
        <div className="border-t border-[var(--color-border)] pt-2">
          <div className="flex justify-between">
            <span className="text-h4 font-bold text-[var(--color-text-primary)]">Total</span>
            <span className="text-h4 font-bold text-[var(--color-text-primary)]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {!freeShippingEligible && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Add {formatCurrency(50 - subtotal)} more for free shipping
        </p>
      )}
    </div>
  );
}
