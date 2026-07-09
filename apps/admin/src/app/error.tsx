'use client';

import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-16 h-16 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-[#dc2626]" />
      </div>
      <h2 className="text-xl font-semibold text-[#000] mb-2">Something went wrong</h2>
      <p className="text-sm text-[#737373] mb-6 text-center max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
