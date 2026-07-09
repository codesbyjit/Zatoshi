'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-sm">
        <h1 className="mb-1 text-h2 text-[var(--color-text-primary)]">Sign In</h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Welcome back! Enter your credentials to continue.
        </p>

        {error && (
          <div className="mb-4 rounded-sm bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error)]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <button type="button" className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
              Forgot password?
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
