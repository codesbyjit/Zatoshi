'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
            {props.required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={clsx(
            'w-full h-10 px-3 rounded-sm border transition-all duration-150 ease-out bg-[var(--color-input-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-base',
            error ? 'border-[var(--color-error)]' : 'border-[var(--color-input-border)] hover:border-[var(--color-border-hover)]',
            'focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.4)]',
            error && 'focus:shadow-[0_0_0_3px_rgba(220,38,38,0.2)]',
            props.disabled && 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-[var(--color-error)]">{error}</span>}
        {helperText && !error && <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
