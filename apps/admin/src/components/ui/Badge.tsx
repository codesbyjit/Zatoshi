'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  accent: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]',
  outline: 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'h-5 px-2 text-[11px]',
  md: 'h-6 px-2 text-xs',
  lg: 'h-7 px-3 text-xs',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium leading-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
