'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { CartItemData } from '@/components/cart/CartItem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CartResponse {
  _id: string;
  items: CartItemData[];
  updatedAt: string;
}

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/trpc/cart.get`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      setCart(data?.result?.data || null);
    } catch {
      setCart(null);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchCart();
  }, [user, authLoading, router, fetchCart]);

  const handleUpdateQuantity = useCallback(
    async (productId: string, quantity: number, variantInfo?: string) => {
      try {
        await fetch(`${API_URL}/trpc/cart.updateQuantity`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity, variantInfo }),
        });
        fetchCart();
      } catch {
        // swallow
      }
    },
    [fetchCart],
  );

  const handleRemoveItem = useCallback(
    async (productId: string, variantInfo?: string) => {
      try {
        await fetch(`${API_URL}/trpc/cart.removeItem`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, variantInfo }),
        });
        fetchCart();
      } catch {
        // swallow
      }
    },
    [fetchCart],
  );

  if (authLoading || pageLoading) {
    return (
      <div className="container-content py-8">
        <h1 className="mb-8 text-h2 text-[var(--color-text-primary)]">Shopping Cart</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="container-content py-8">
        <h1 className="mb-8 text-h2 text-[var(--color-text-primary)]">Shopping Cart</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="mb-6 text-[var(--color-text-muted)]" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h2 className="text-h3 text-[var(--color-text-primary)]">Your cart is empty</h2>
          <p className="mt-2 text-body text-[var(--color-text-secondary)]">Looks like you haven&apos;t added anything yet.</p>
          <Link href="/products" className="mt-6">
            <Button variant="primary" size="lg">Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-content py-8">
      <h1 className="mb-8 text-h2 text-[var(--color-text-primary)]">Shopping Cart</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* Cart items */}
        <div>
          <div className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
            {items.map((item, idx) => (
              <CartItem
                key={`${item.productId}-${idx}`}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>

          <div className="mt-6">
            <Link href="/checkout">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Proceed to Checkout &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}
