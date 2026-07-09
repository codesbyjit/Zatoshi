'use client';

import type { ReactNode } from 'react';
import { AdminAuthProvider } from '@/providers/AdminAuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { ThemeProvider } from '@/components/ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <ToastProvider>
          <AdminShell>{children}</AdminShell>
        </ToastProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
