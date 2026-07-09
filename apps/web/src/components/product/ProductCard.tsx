'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { formatCurrency, getDiscountPercentage, resolveImageUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Product } from '@repo/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isSoldOut = product.inventory === 0;
  const discount = isOnSale ? getDiscountPercentage(product.compareAtPrice!, product.price) : 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm',
        'transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-product-hover',
      )}
    >
      {/* Image area */}
      <Link href={`/products/${product.slug}`} className="block overflow-hidden">
        <div className="relative aspect-square bg-[var(--color-bg-secondary)]">
          {product.images.length > 0 ? (
            <img
              src={resolveImageUrl(product.images[0])}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[var(--color-text-muted)]"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}

          {/* Badges — smaller, positioned absolute top-left */}
          {isSoldOut && (
            <Badge
              variant="neutral"
              size="sm"
              className="absolute left-1.5 top-1.5 bg-[var(--color-bg)]/90 text-[10px] leading-none px-1.5 h-4"
            >
              Sold Out
            </Badge>
          )}
          {isOnSale && !isSoldOut && (
            <Badge variant="error" size="sm" className="absolute left-1.5 top-1.5 text-[10px] leading-none px-1.5 h-4">
              {discount}% OFF
            </Badge>
          )}

          {/* Quick add button — always visible on mobile, visible on hover on desktop */}
          {!isSoldOut && (
            <button
              type="button"
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-sm bg-[var(--color-bg)]/90 text-[var(--color-text-primary)] shadow-sm transition-all duration-150 hover:bg-[var(--color-bg)] md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Quick add ${product.name} to cart`}
              disabled={isAdding}
              onClick={async () => {
                setIsAdding(true);
                try {
                  await fetch(`${API_URL}/trpc/cart.addItem`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: product._id, quantity: 1 }),
                  });
                } catch {
                  // Silently fail for quick-add
                } finally {
                  setIsAdding(false);
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2 1L1 3v10a1 1 0 001 1h10a1 1 0 001-1V3l-1-2H2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M1 3h14" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 7a3 3 0 01-6 0" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          )}
        </div>
      </Link>

      {/* Content — compact padding */}
      <div className="p-2 sm:p-3">
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-xs sm:text-sm leading-tight text-[var(--color-text-primary)] line-clamp-2 transition-colors hover:text-[var(--color-accent)]">
            {product.name}
          </h3>
        </Link>

        {/* Rating — hidden on mobile, visible on sm+ */}
        {product.rating > 0 && (
          <div className="mt-0.5 hidden sm:block">
            <StarRating rating={product.rating} reviewCount={product.reviewCount} size="sm" />
          </div>
        )}

        <div className="mt-1 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
            {formatCurrency(product.price)}
          </span>
          {isOnSale && (
            <span className="text-[10px] sm:text-xs text-[var(--color-text-muted)] line-through">
              {formatCurrency(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
