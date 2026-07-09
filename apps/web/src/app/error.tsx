'use client';

import { Button } from '@/components/ui/Button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-content flex min-h-[60vh] flex-col items-center justify-center text-center">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        className="mb-6 text-[var(--color-error)]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h1 className="text-h1 text-[var(--color-text-primary)]">Something went wrong</h1>
      <p className="mt-2 text-body text-[var(--color-text-secondary)] max-w-md">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <Button variant="primary" size="lg" className="mt-6" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
