import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Order Confirmed',
  description: 'Your order has been placed successfully.',
};

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string; orderNumber?: string };
}) {
  const orderId = searchParams.orderId || 'N/A';
  const orderNumber = searchParams.orderNumber || '';

  return (
    <div className="container-content flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-[var(--color-success)]" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="text-h1 text-[var(--color-text-primary)]">Order Confirmed!</h1>
      <p className="mt-3 text-body text-[var(--color-text-secondary)] max-w-md">
        Thank you for your purchase. Your order has been placed successfully.
        You&apos;ll receive a confirmation email shortly.
      </p>

      <div className="mt-6 rounded-md bg-[var(--color-bg-secondary)] px-6 py-4">
        <p className="text-sm text-[var(--color-text-muted)]">Order Number</p>
        <p className="font-mono text-lg font-semibold text-[var(--color-text-primary)]">
          {orderNumber || orderId}
        </p>
      </div>

      <div className="mt-8 flex gap-4">
        <Link href={`/orders/${orderId}`}>
          <Button variant="primary" size="lg">
            View Order
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="secondary" size="lg">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
