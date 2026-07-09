'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
            {props.required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full h-10 px-3 pr-8 rounded-sm border transition-all duration-150 ease-out bg-[var(--color-input-bg)] text-[var(--color-text-primary)] text-base appearance-none cursor-pointer',
              error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)] hover:border-[var(--color-border-hover)]',
              'focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.4)]',
              props.disabled && 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && <span className="text-xs text-[var(--color-error)]">{error}</span>}
      </div>
    );
  },
);

Select.displayName = 'Select';
