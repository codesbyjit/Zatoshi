import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-content flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-[96px] font-bold leading-none text-[var(--color-accent)]">404</h1>
      <h2 className="mt-4 text-h2 text-[var(--color-text-primary)]">Page Not Found</h2>
      <p className="mt-2 text-body text-[var(--color-text-secondary)] max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/">
          <Button variant="primary" size="lg">
            Back to Home
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="secondary" size="lg">
            Browse Products
          </Button>
        </Link>
      </div>
    </div>
  );
}
