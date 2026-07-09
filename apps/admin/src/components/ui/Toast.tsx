'use client';

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-4 w-4 text-[var(--color-error)]" />,
  warning: <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />,
  info: <Info className="h-4 w-4 text-[var(--color-info)]" />,
};

const borderColors: Record<ToastVariant, string> = {
  success: 'border-l-[var(--color-success)]',
  error: 'border-l-[var(--color-error)]',
  warning: 'border-l-[var(--color-warning)]',
  info: 'border-l-[var(--color-info)]',
};

function ToastItemComponent({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => onRemove(toast.id), toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 pr-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-md shadow-xl',
        'w-[360px] max-w-[calc(100vw-32px)]',
        borderColors[toast.variant],
        'border-l-4',
      )}
    >
      <span className="mt-0.5 flex-shrink-0">{icons[toast.variant]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{toast.title}</p>
        {toast.message && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[700] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItemComponent toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
