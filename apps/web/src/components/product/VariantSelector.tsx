'use client';

import { cn } from '@/lib/utils';

export interface VariantOption {
  name: string;
  value: string;
  available: boolean;
}

interface VariantSelectorProps {
  label: string;
  options: VariantOption[];
  selectedValue?: string;
  onChange: (value: string) => void;
}

export function VariantSelector({
  label,
  options,
  selectedValue,
  onChange,
}: VariantSelectorProps) {
  return (
    <div>
      <label className="mb-1 block text-sm-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={!option.available}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-center rounded-sm border px-3 py-1.5 text-sm transition-all duration-150',
              selectedValue === option.value
                ? 'border-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] font-medium text-[var(--color-accent)]'
                : 'border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)]',
              !option.available &&
                'cursor-not-allowed opacity-30 line-through',
            )}
            aria-label={`${label}: ${option.value}${!option.available ? ' (unavailable)' : ''}`}
            aria-pressed={selectedValue === option.value}
          >
            {option.value}
          </button>
        ))}
      </div>
    </div>
  );
}
