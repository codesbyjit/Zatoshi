'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, string> = {
  sm: 'h-8 text-sm px-2',
  md: 'h-10 text-body px-3',
  lg: 'h-12 text-body px-4',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      disabled,
      readOnly,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm-medium text-[var(--color-text-primary)]"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-[var(--color-error)]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-[var(--color-text-muted)]">{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            className={cn(
              'w-full rounded-sm border bg-[var(--color-bg)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-muted)]',
              'transition-[border-color,box-shadow] duration-150 ease-out',
              error
                ? 'border-[var(--color-error)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-error)_20%,transparent)] focus:border-[var(--color-error)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_40%,transparent)]',
              disabled && 'cursor-not-allowed bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]',
              readOnly && 'cursor-default bg-[var(--color-bg-secondary)]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              sizeStyles[inputSize],
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-[var(--color-text-muted)]">{rightIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-caption text-[var(--color-error)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-caption text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
