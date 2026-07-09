'use client';

import { type ReactNode } from 'react';
import { TRPCProvider } from '@/providers/TRPCProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TRPCProvider>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </TRPCProvider>
    </ThemeProvider>
  );
}
