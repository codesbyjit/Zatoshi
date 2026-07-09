import { clsx, type ClassValue } from 'clsx';

/**
 * Merge class names with clsx.
 * Wraps clsx for Tailwind class merging (extend with tailwind-merge if needed).
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format a number as currency (USD).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format a date to a readable string.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format a date to a short string (MM/DD/YYYY).
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Generate a simple unique ID (for idempotency keys etc).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculate discount percentage between original and sale price.
 */
export function getDiscountPercentage(original: number, sale: number): number {
  return Math.round(((original - sale) / original) * 100);
}

/**
 * Check if shipping is free based on subtotal.
 */
export function isFreeShipping(subtotal: number): boolean {
  return subtotal >= 50;
}

/**
 * Calculate estimated shipping cost.
 */
export function getShippingCost(subtotal: number): number {
  if (subtotal >= 50) return 0;
  return 5.99;
}

/**
 * Calculate estimated tax (8%).
 */
export function getTax(subtotal: number): number {
  return Math.round(subtotal * 0.08 * 100) / 100;
}

/**
 * Truncate text to a max length.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Resolve an image URL — prepend API base for relative paths like /images/...
 * so they work from the web storefront (port 3000) → API (port 3001).
 */
export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

/**
 * Get the status badge variant from a status string.
 */
export function getStatusVariant(
  status: string,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'paid':
    case 'delivered':
    case 'active':
    case 'completed':
    case 'confirmed':
      return 'success';
    case 'pending':
    case 'processing':
    case 'shipped':
      return 'warning';
    case 'failed':
    case 'cancelled':
    case 'refunded':
      return 'error';
    case 'draft':
    case 'inactive':
      return 'neutral';
    default:
      return 'info';
  }
}
