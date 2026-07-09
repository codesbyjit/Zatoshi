'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ProductTable } from '@/components/products/ProductTable';
import { trpcCall } from '@/lib/trpc';

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  categoryId: string;
  images: string[];
  inventory: number;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  variants: Array<{
    name: string;
    sku: string;
    price?: number;
    inventory: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  image?: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  isActive: boolean;
}

export default function ProductsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodResult, catResult] = await Promise.all([
        trpcCall<{ items: ApiProduct[]; total: number }>('GET:product.list', { limit: 100, includeInactive: true }),
        trpcCall<ApiCategory[]>('GET:category.list', {}),
      ]);

      // Build category ID → name map
      const catMap = new Map<string, string>();
      (catResult || []).forEach((c) => catMap.set(c._id, c.name));
      setCategories(Array.from(catMap.values()));

      // Map API products to table format
      const mapped: ProductItem[] = (prodResult?.items || []).map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.variants?.[0]?.sku || '—',
        image: p.images?.[0],
        category: catMap.get(p.categoryId) || p.categoryId,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? undefined,
        inventory: p.inventory,
        isActive: p.isActive,
      }));

      setProducts(mapped);
      setTotal(prodResult?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => trpcCall('product.delete', { id })));
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete products');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000]">Products</h1>
        <p className="text-sm text-[#737373] mt-1">{total} total</p>
      </div>

      {error && (
        <div className="p-3 rounded-sm bg-[#fef2f2] border border-[#fecaca] text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      <ProductTable
        products={paginated}
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={setSearch}
        onCategoryFilter={setCategoryFilter}
        onDelete={handleDelete}
        categories={categories}
        isLoading={loading}
      />
    </div>
  );
}
