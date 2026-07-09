'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveImageUrl } from '@/lib/utils';

interface ImageLightboxProps {
  images: string[];
  selectedIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  productName: string;
}

export function ImageLightbox({
  images,
  selectedIndex,
  isOpen,
  onClose,
  onNavigate,
  productName,
}: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft': {
          e.preventDefault();
          const prevIndex =
            selectedIndex > 0 ? selectedIndex - 1 : images.length - 1;
          onNavigate(prevIndex);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const nextIndex =
            selectedIndex < images.length - 1 ? selectedIndex + 1 : 0;
          onNavigate(nextIndex);
          break;
        }
      }
    },
    [onClose, onNavigate, selectedIndex, images.length],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[600] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image ${selectedIndex + 1} of ${images.length}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[var(--color-overlay)]" />

          {/* Close button — top right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-lg transition-colors duration-150 hover:bg-[var(--color-bg-tertiary)] touch-target"
            aria-label="Close lightbox"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Previous button — left side, vertically centered */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(
                  selectedIndex > 0
                    ? selectedIndex - 1
                    : images.length - 1,
                );
              }}
              className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-lg transition-colors duration-150 hover:bg-[var(--color-bg-tertiary)] touch-target"
              aria-label="Previous image"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12.5 15l-5-5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Next button — right side, vertically centered */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(
                  selectedIndex < images.length - 1
                    ? selectedIndex + 1
                    : 0,
                );
              }}
              className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-lg transition-colors duration-150 hover:bg-[var(--color-bg-tertiary)] touch-target"
              aria-label="Next image"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7.5 15l5-5-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Image — centered with object-contain */}
          <motion.div
            key={selectedIndex}
            className="relative z-[1] flex max-h-[90vh] max-w-[90vw] items-center justify-center rounded-md"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolveImageUrl(images[selectedIndex])}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              className="max-h-[85vh] max-w-[85vw] rounded-md object-contain"
              draggable={false}
            />
          </motion.div>

          {/* Image counter — bottom center */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--color-bg-secondary)] px-4 py-2 text-sm text-[var(--color-text-secondary)] shadow-lg">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
