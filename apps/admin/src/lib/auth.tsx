'use client';

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  avatarUrl?: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch user on mount via httpOnly cookies
  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/trpc/auth.me`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        const result = data?.result?.data;
        if (result && result.role === 'admin' && !cancelled) {
          setUser({
            id: result._id,
            name: result.name,
            email: result.email,
            role: 'admin',
            avatarUrl: result.avatarUrl,
          });
          if (!cancelled) setIsLoading(false);
          return;
        }
      } catch {
        // Not authenticated — try refresh
      }

      // Try refresh in case access token expired
      try {
        await fetch(`${API_URL}/trpc/auth.refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        // Retry auth.me after refresh
        const res2 = await fetch(`${API_URL}/trpc/auth.me`, {
          credentials: 'include',
        });
        if (res2.ok && !cancelled) {
          const data2 = await res2.json();
          const result2 = data2?.result?.data;
          if (result2 && result2.role === 'admin') {
            setUser({
              id: result2._id,
              name: result2.name,
              email: result2.email,
              role: 'admin',
              avatarUrl: result2.avatarUrl,
            });
          }
        }
      } catch {
        // Not authenticated
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchUser();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/trpc/auth.login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error?.message || 'Login failed');
      }
      const result = data?.result?.data;

      if (!result || result.user.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const adminUser: AdminUser = {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        role: 'admin',
        avatarUrl: result.user.avatarUrl,
      };

      // Server sets httpOnly cookies automatically
      setUser(adminUser);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    fetch(`${API_URL}/trpc/auth.logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // Ignore logout errors
    });
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && user.role === 'admin',
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
