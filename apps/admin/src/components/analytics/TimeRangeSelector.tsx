'use client';

import clsx from 'clsx';

export type TimeRange = '1d' | '7d' | '30d' | '90d';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
      {RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
            value === range.value
              ? 'bg-[var(--color-accent)] text-white shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]',
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
