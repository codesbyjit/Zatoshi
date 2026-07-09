'use client';

import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { QuantitySelector } from '@/components/ui/QuantitySelector';

export interface CartItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantInfo?: string;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity?: (productId: string, quantity: number, variantInfo?: string) => void;
  onRemove?: (productId: string, variantInfo?: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const lineTotal = item.price * item.quantity;

  return (
    <div className="flex gap-4 border-b border-[var(--color-border)] py-4">
      {/* Image */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-[var(--color-bg-secondary)]">
        {item.image ? (
          <img
            src={resolveImageUrl(item.image)}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-body-medium text-[var(--color-text-primary)]">
          {item.name}
        </h4>
        {item.variantInfo && (
          <p className="text-sm text-[var(--color-text-muted)]">{item.variantInfo}</p>
        )}
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {formatCurrency(item.price)} each
        </p>

        <div className="mt-2 flex items-center justify-between">
          <QuantitySelector
            value={item.quantity}
            onChange={(qty) => onUpdateQuantity?.(item.productId, qty, item.variantInfo)}
          />
          <div className="flex items-center gap-3">
            <span className="text-body-medium text-[var(--color-text-primary)]">
              {formatCurrency(lineTotal)}
            </span>
            <button
              type="button"
              onClick={() => onRemove?.(item.productId, item.variantInfo)}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-error)]"
              aria-label={`Remove ${item.name} from cart`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4m-6 0v7a1 1 0 001 1h4a1 1 0 001-1V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
