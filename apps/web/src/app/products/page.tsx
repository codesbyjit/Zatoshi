import { Suspense } from 'react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { ProductsPageContent } from './ProductsPageContent';

export const metadata = {
  title: 'Products',
  description: 'Browse our collection of premium products.',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getCategories() {
  try {
    const res = await fetch(`${API_URL}/trpc/category.list`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return data?.result?.data || [];
  } catch {
    return [];
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const categories = await getCategories();

  return (
    <div className="container-content py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-[var(--color-text-primary)]">Products</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Browse our collection</p>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <ProductsPageContent
          categories={categories}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  );
}
