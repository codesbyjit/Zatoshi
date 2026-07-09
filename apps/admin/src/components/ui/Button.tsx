'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out cursor-pointer border-0';
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)]',
      secondary: 'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-tertiary)]',
      ghost: 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] active:bg-[var(--color-bg-tertiary)]',
      danger: 'bg-[var(--color-error)] text-white hover:bg-[var(--color-error-hover)] active:bg-[var(--color-error-active)]',
    };
    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-sm rounded-sm',
      md: 'h-10 px-4 text-base rounded-sm',
      lg: 'h-12 px-6 text-base rounded-md',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none', className)}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
