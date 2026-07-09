import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  neutral: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  accent: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]',
  outline: 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-5 px-2 text-caption',
  md: 'h-6 px-2 text-caption',
  lg: 'h-7 px-3 text-caption',
};

export function Badge({ variant = 'neutral', size = 'md', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium leading-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
