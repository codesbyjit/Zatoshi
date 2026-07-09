'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters, type FilterState } from '@/components/product/ProductFilters';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Category, Product } from '@repo/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProductsPageContentProps {
  categories: Category[];
  searchParams: { [key: string]: string | string[] | undefined };
}

export function ProductsPageContent({
  categories,
  searchParams,
}: ProductsPageContentProps) {
  const router = useRouter();
  const urlParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState<FilterState>(() => {
    const f: FilterState = {};
    const catId = urlParams.get('categoryId');
    const search = urlParams.get('search');
    if (catId) f.categoryId = catId;
    if (search) f.tags = [search];
    return f;
  });

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 12,
      };

      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      switch (sortBy) {
        case 'price-asc':
          params.sortBy = 'price';
          params.sortOrder = 'asc';
          break;
        case 'price-desc':
          params.sortBy = 'price';
          params.sortOrder = 'desc';
          break;
        case 'rating':
          params.sortBy = 'rating';
          params.sortOrder = 'desc';
          break;
        case 'newest':
        default:
          params.sortBy = 'createdAt';
          params.sortOrder = 'desc';
          break;
      }

      const res = await fetch(
        `${API_URL}/trpc/product.list?input=${encodeURIComponent(JSON.stringify(params))}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      const result = data?.result?.data;
      if (result) {
        setProducts(result.items || []);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.total || 0);
      }
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex gap-8">
      {/* Desktop sidebar filters */}
      <aside className="hidden w-[280px] shrink-0 lg:block">
        <div className="sticky top-24">
          <ProductFilters
            categories={categories}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>
      </aside>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <>
          <div
            className="fixed inset-0 z-[500] bg-[var(--color-overlay)] lg:hidden"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[500] w-[300px] overflow-y-auto bg-[var(--color-bg)] p-4 shadow-lg lg:hidden">
            <ProductFilters
              categories={categories}
              filters={filters}
              onFilterChange={handleFilterChange}
              isMobile
              onApply={() => setShowMobileFilters(false)}
              onClose={() => setShowMobileFilters(false)}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMobileFilters(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="mr-1"
                aria-hidden="true"
              >
                <path
                  d="M1 2h12M3 7h8M5 12h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Filters
            </Button>
            <span className="text-sm text-[var(--color-text-muted)]">
              {totalCount} {totalCount === 1 ? 'product' : 'products'}
            </span>
          </div>

          <select
            value={sortBy}
            onChange={handleSortChange}
            className="h-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_40%,transparent)]"
            aria-label="Sort products"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Best Rating</option>
          </select>
        </div>

        {/* Product Grid */}
        <ProductGrid products={products} isLoading={isLoading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              compact={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
