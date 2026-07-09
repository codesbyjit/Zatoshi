'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const iconMap: Record<ToastVariant, { path: string; color: string }> = {
  success: {
    path: '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'text-[var(--color-success)]',
  },
  error: {
    path: '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'text-[var(--color-error)]',
  },
  warning: {
    path: '<path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 003 20h18a1 1 0 00.89-1.54L13.71 3.86a1 1 0 00-1.72 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'text-[var(--color-warning)]',
  },
  info: {
    path: '<path d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    color: 'text-[var(--color-info)]',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);

      if (toast.variant !== 'error') {
        setTimeout(() => removeToast(id), 5000);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed right-4 top-4 z-[700] flex flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'flex w-[360px] items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 pr-4 shadow-xl',
                'max-sm:w-[calc(100vw-32px)]',
              )}
              role="alert"
            >
              {/* Icon */}
              <span
                className={cn('mt-0.5 shrink-0', iconMap[toast.variant].color)}
                dangerouslySetInnerHTML={{
                  __html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">${iconMap[toast.variant].path}</svg>`,
                }}
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-body-medium text-[var(--color-text-primary)]">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm text-[var(--color-text-muted)]">{toast.message}</p>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                aria-label="Dismiss notification"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M9 3L3 9M3 3l6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
