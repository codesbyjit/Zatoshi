'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductGallery } from '@/components/product/ProductGallery';
import { VariantSelector } from '@/components/product/VariantSelector';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, getDiscountPercentage, resolveImageUrl } from '@/lib/utils';
import type { Product } from '@repo/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProductDetailContentProps {
  product: Product;
  relatedProducts: any[];
}

export function ProductDetailContent({ product, relatedProducts }: ProductDetailContentProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartFeedback, setCartFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isOnSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const isSoldOut = product.inventory === 0;
  const discount = isOnSale ? getDiscountPercentage(product.compareAtPrice!, product.price) : 0;

  const variantOptions = product.variants.map((v) => ({
    name: v.name,
    value: v.name,
    available: v.inventory > 0,
  }));

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    setCartFeedback(null);
    try {
      const res = await fetch(`${API_URL}/trpc/cart.addItem`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          variantInfo: selectedVariant,
          quantity,
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to add item to cart');
      }
      setCartFeedback({ type: 'success', message: 'Added to cart!' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item to cart';
      setCartFeedback({ type: 'error', message });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-[var(--color-text-muted)]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[var(--color-text-primary)]">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-[var(--color-text-primary)]">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-text-primary)]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Gallery */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Right: Product info */}
        <div>
          <h1 className="text-h2 text-[var(--color-text-primary)] md:text-h2">
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="mt-2">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} />
            </div>
          )}

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-h3 font-bold text-[var(--color-text-primary)]">
              {formatCurrency(product.price)}
            </span>
            {isOnSale && (
              <>
                <span className="text-body text-[var(--color-text-muted)] line-through">
                  {formatCurrency(product.compareAtPrice!)}
                </span>
                <Badge variant="error" size="sm">
                  {discount}% OFF
                </Badge>
              </>
            )}
          </div>

          {/* Description */}
          <p className="mt-4 text-body text-[var(--color-text-secondary)] leading-relaxed max-w-[65ch]">
            {product.description}
          </p>

          {/* Variants */}
          {variantOptions.length > 0 && (
            <div className="mt-6">
              <VariantSelector
                label="Variant"
                options={variantOptions}
                selectedValue={selectedVariant}
                onChange={setSelectedVariant}
              />
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm-medium text-[var(--color-text-primary)]">
                Quantity
              </label>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                max={product.inventory > 0 ? Math.min(product.inventory, 99) : 0}
              />
              {product.inventory <= 5 && product.inventory > 0 && (
                <p className="mt-1 text-xs text-[var(--color-warning)]">
                  Only {product.inventory} left in stock
                </p>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full md:w-auto md:min-w-[240px]"
              isLoading={isAddingToCart}
              disabled={isSoldOut}
              onClick={handleAddToCart}
              leftIcon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M3 1L1 3v14a2 2 0 002 2h14a2 2 0 002-2V3l-2-2H3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M1 3h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14 7a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
            >
              {isSoldOut ? 'Sold Out' : 'Add to Cart'}
            </Button>

            {/* Cart feedback */}
            {cartFeedback && (
              <p
                className={`mt-2 text-sm ${
                  cartFeedback.type === 'success'
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-error)]'
                }`}
              >
                {cartFeedback.message}
              </p>
            )}
          </div>

          {/* Shipping info */}
          <div className="mt-6 rounded-md bg-[var(--color-bg-secondary)] p-4">
            <div className="flex items-start gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                className="mt-0.5 shrink-0 text-[var(--color-text-muted)]"
                aria-hidden="true"
              >
                <rect x="1" y="3" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 8h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="5.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="14.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
              <div>
                <p className="text-sm-medium text-[var(--color-text-primary)]">Free shipping on orders over $50</p>
                <p className="text-xs text-[var(--color-text-muted)]">Estimated delivery: 3-5 business days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-h2 text-[var(--color-text-primary)]">You May Also Like</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((rp: any) => (
              <Link
                key={rp._id}
                href={`/products/${rp.slug}`}
                className="group overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-product-hover"
              >
                <div className="aspect-square overflow-hidden bg-[var(--color-bg-secondary)]">
                  {rp.images?.[0] ? (
                    <img
                      src={resolveImageUrl(rp.images[0])}
                      alt={rp.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm-medium text-[var(--color-text-primary)] truncate">{rp.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                    {formatCurrency(rp.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
