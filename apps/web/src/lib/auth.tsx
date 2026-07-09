'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ──────────────────────────────────────────
// API URL
// ──────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ──────────────────────────────────────────
// Context
// ──────────────────────────────────────────

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch user on mount via httpOnly cookie
  // Includes automatic refresh if access token has expired
  useEffect(() => {
    let cancelled = false;

    async function fetchOrRefresh() {
      // First attempt: try current access token
      try {
        const res = await fetch(`${API_URL}/trpc/auth.me`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        const result = data?.result?.data;
        if (result && !cancelled) {
          setUser({
            _id: result._id,
            email: result.email,
            name: result.name,
            role: result.role,
            avatarUrl: result.avatarUrl,
          });
          if (!cancelled) setIsLoading(false);
          return;
        }
      } catch {
        // Not authenticated — try refresh below
      }

      // Second attempt: refresh token might still be valid
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
          if (result2) {
            setUser({
              _id: result2._id,
              email: result2.email,
              name: result2.name,
              role: result2.role,
              avatarUrl: result2.avatarUrl,
            });
          }
        }
      } catch {
        // Not authenticated — user stays null
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchOrRefresh();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/trpc/auth.login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      const result = data?.result?.data;
      if (!result) {
        throw new Error(data?.error?.message || 'Login failed');
      }
      // Server sets httpOnly cookies automatically
      setUser(result.user);
      router.refresh();
    },
    [router],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${API_URL}/trpc/auth.register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      const result = data?.result?.data;
      if (!result) {
        throw new Error(data?.error?.message || 'Registration failed');
      }
      // Server sets httpOnly cookies automatically
      setUser(result.user);
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(() => {
    fetch(`${API_URL}/trpc/auth.logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // Ignore logout errors
    });
    setUser(null);
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
