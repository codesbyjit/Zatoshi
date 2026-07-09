'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchBar } from '@/components/product/SearchBar';

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
}

export function MobileNav({ isOpen, onClose, links }: MobileNavProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-[500] bg-[var(--color-overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-y-0 left-0 z-[500] w-[280px] bg-[var(--color-bg)] shadow-lg"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
                <span className="text-h3 font-bold text-[var(--color-text-primary)]">Menu</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  aria-label="Close menu"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M12 4L4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <SearchBar onSearch={onClose} />
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-2 py-4">
                <ul className="space-y-1">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="flex items-center rounded-sm px-3 py-2.5 text-body-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer */}
              <div className="border-t border-[var(--color-border)] px-4 py-4">
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="block w-full rounded-sm bg-[var(--color-accent)] px-4 py-2.5 text-center text-body-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
