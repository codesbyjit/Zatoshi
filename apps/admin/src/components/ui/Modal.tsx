'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
}

const sizeStyles = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--color-overlay)]"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      {/* Modal content */}
      <div
        className={clsx(
          'relative bg-[var(--color-card)] rounded-lg shadow-lg z-[601] w-[calc(100vw-32px)] max-h-[85vh] overflow-y-auto p-6',
          sizeStyles[size],
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-sm bg-transparent hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
