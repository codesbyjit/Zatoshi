'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { CartItemData } from '@/components/cart/CartItem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (isAuthenticated) {
        fetchCart();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/trpc/cart.get`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      setItems(data?.result?.data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[500] bg-[var(--color-overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-y-0 right-0 z-[500] flex w-full flex-col bg-[var(--color-bg)] shadow-xl sm:w-[420px]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
              <h2 className="text-h3 text-[var(--color-text-primary)]">
                Cart
                {itemCount > 0 && (
                  <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                    ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Close cart"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-[var(--color-text-muted)]" aria-hidden="true">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-body-medium text-[var(--color-text-primary)]">Your cart is empty</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">Add some items to get started</p>
                  <Link href="/products" onClick={onClose} className="mt-4 text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
                    Continue Shopping &rarr;
                  </Link>
                </div>
              ) : (
                <div className="space-y-0">
                  {items.map((item, idx) => (
                    <CartItem key={`${item.productId}-${idx}`} item={item} />
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--color-border)] px-4 py-4">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-body text-[var(--color-text-secondary)]">Subtotal</span>
                    <span className="text-body-medium text-[var(--color-text-primary)]">{formatCurrency(subtotal)}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {subtotal >= 50 ? 'Free shipping' : `Add ${formatCurrency(50 - subtotal)} for free shipping`}
                  </p>
                </div>
                <Link href="/checkout" onClick={onClose}>
                  <Button variant="primary" size="lg" className="w-full">
                    Checkout &mdash; {formatCurrency(subtotal)}
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 w-full py-2 text-center text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
