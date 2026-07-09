'use client';

import { cn } from '@/lib/utils';

export interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function QuantitySelector({
  value,
  min = 1,
  max = 99,
  onChange,
  className,
}: QuantitySelectorProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={cn('inline-flex items-center rounded-sm border border-[var(--color-border)]', className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center text-[var(--color-text-primary)] transition-colors duration-150 hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
        aria-label="Decrease quantity"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2.5 6h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span
        className="flex min-w-[32px] items-center justify-center text-body-medium text-[var(--color-text-primary)]"
        aria-live="polite"
        aria-label={`Quantity: ${value}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center text-[var(--color-text-primary)] transition-colors duration-150 hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
        aria-label="Increase quantity"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 2.5v7M2.5 6h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
