'use client';

import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="h-9 px-3 flex items-center gap-1 text-sm font-medium rounded-sm bg-transparent hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`e-${idx}`} className="h-9 w-9 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={clsx(
              'h-9 w-9 flex items-center justify-center text-sm rounded-sm transition-colors',
              page === currentPage
                ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold'
                : 'bg-transparent hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
            )}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="h-9 px-3 flex items-center gap-1 text-sm font-medium rounded-sm bg-transparent hover:bg-[var(--color-bg-secondary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
