'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Category } from '@repo/types';

export interface FilterState {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  rating?: number;
}

interface ProductFiltersProps {
  categories: Category[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  isMobile?: boolean;
  onApply?: () => void;
  onClose?: () => void;
}

export function ProductFilters({
  categories,
  filters,
  onFilterChange,
  isMobile = false,
  onApply,
  onClose,
}: ProductFiltersProps) {
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice?.toString() || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice?.toString() || '');

  const handleCategoryChange = (categoryId: string) => {
    onFilterChange({
      ...filters,
      categoryId: filters.categoryId === categoryId ? undefined : categoryId,
    });
  };

  const handlePriceApply = () => {
    onFilterChange({
      ...filters,
      minPrice: localMinPrice ? parseFloat(localMinPrice) : undefined,
      maxPrice: localMaxPrice ? parseFloat(localMaxPrice) : undefined,
    });
  };

  const handleClearAll = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    onFilterChange({});
  };

  const hasActiveFilters = filters.categoryId || filters.minPrice || filters.maxPrice || filters.tags?.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      {isMobile && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <h3 className="text-h4 text-[var(--color-text-primary)]">Filters</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]"
            aria-label="Close filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
        >
          Clear All
        </button>
      )}

      {/* Category filter */}
      <div>
        <h4 className="mb-2 text-sm-medium text-[var(--color-text-primary)]">Category</h4>
        <div className="space-y-1">
          {categories.map((category) => (
            <label
              key={category._id}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <input
                type="checkbox"
                checked={filters.categoryId === category._id}
                onChange={() => handleCategoryChange(category._id)}
                className="h-4 w-4 rounded-sm border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h4 className="mb-2 text-sm-medium text-[var(--color-text-primary)]">Price Range</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localMinPrice}
            onChange={(e) => setLocalMinPrice(e.target.value)}
            className="h-8 w-full rounded-sm border border-[var(--color-border)] px-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_40%,transparent)]"
          />
          <span className="text-[var(--color-text-muted)]">&ndash;</span>
          <input
            type="number"
            placeholder="Max"
            value={localMaxPrice}
            onChange={(e) => setLocalMaxPrice(e.target.value)}
            className="h-8 w-full rounded-sm border border-[var(--color-border)] px-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_40%,transparent)]"
          />
        </div>
        <button
          type="button"
          onClick={handlePriceApply}
          className="mt-2 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          Apply
        </button>
      </div>

      {/* Mobile: Apply button */}
      {isMobile && (
        <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] pt-4">
          <div className="flex gap-3">
            <Button variant="ghost" size="md" onClick={handleClearAll} className="flex-1">
              Clear All
            </Button>
            <Button variant="primary" size="md" onClick={onApply} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
