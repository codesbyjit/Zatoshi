'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] card p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-[var(--color-accent)] flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-[var(--color-text-inverse)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Admin Login</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Sign in to the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-[var(--color-error-bg)] border border-[var(--color-border)] text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
