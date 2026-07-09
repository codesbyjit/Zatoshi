'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] disabled:bg-[#d1d5db] disabled:text-[#9ca3af] shadow-sm hover:shadow',
  secondary:
    'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:border-[var(--color-border)]',
  ghost:
    'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:opacity-50',
  danger:
    'bg-[var(--color-error)] text-[var(--color-text-inverse)] hover:bg-[#b91c1c] active:bg-[#991b1b] disabled:bg-[#fca5a5] disabled:text-[#fef2f2] shadow-sm hover:shadow',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-sm rounded-sm',
  md: 'h-10 px-4 text-body rounded-sm',
  lg: 'h-12 px-6 text-body-medium rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out',
          'focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_40%,transparent)]',
          'active:scale-[0.97] active:duration-75',
          'disabled:cursor-not-allowed disabled:shadow-none disabled:hover:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin-custom h-[18px] w-[18px]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
        {children}
        {rightIcon && !isLoading && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
