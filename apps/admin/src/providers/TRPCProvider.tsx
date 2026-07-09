'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { getTRPCClient } from '@/lib/trpc';

interface TRPCClientType {
  query: <T = unknown>(path: string, input?: unknown) => Promise<T>;
  mutate: <T = unknown>(path: string, input?: unknown) => Promise<T>;
}

const TRPCContext = createContext<TRPCClientType | null>(null);

export function TRPCProvider({ children }: { children: ReactNode }) {
  const client = getTRPCClient();

  return (
    <TRPCContext.Provider value={client}>
      {children}
    </TRPCContext.Provider>
  );
}

export function useTRPC(): TRPCClientType {
  const ctx = useContext(TRPCContext);
  if (!ctx) throw new Error('useTRPC must be used within TRPCProvider');
  return ctx;
}
