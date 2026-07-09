import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/product/ProductCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ──────────────────────────────────────────
// Data fetching helpers
// ──────────────────────────────────────────

async function fetchFeaturedProducts() {
  try {
    const res = await fetch(`${API_URL}/trpc/product.list?input=${encodeURIComponent(JSON.stringify({
      limit: 8,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }))}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return data?.result?.data?.items || [];
  } catch {
    return [];
  }
}

async function fetchCategories() {
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

// ──────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    fetchFeaturedProducts(),
    fetchCategories(),
  ]);

  const featuredProducts = products.filter((p: any) => p.isFeatured).slice(0, 8);
  const displayProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8);

  return (
    <>
      {/* Hero Section */}
      <section className="bg-[var(--color-bg-secondary)]">
        <div className="container-content flex h-[320px] items-center md:h-[480px]">
          <div className="max-w-lg">
            <h1 className="text-h1 text-balance text-[var(--color-text-primary)] md:text-[40px]">
              Discover Premium Products
            </h1>
            <p className="mt-4 text-body text-[var(--color-text-secondary)] max-w-md">
              Shop the latest collection of high-quality products curated just for you.
              Free shipping on orders over $50.
            </p>
            <div className="mt-8 flex gap-4">
              <Link href="/products">
                <Button variant="primary" size="lg">
                  Shop Now
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="secondary" size="lg">
                  Browse All
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container-content py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-h2 text-[var(--color-text-primary)]">Featured Products</h2>
          <Link
            href="/products"
            className="text-sm-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
          >
            View All &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayProducts.length > 0 ? (
            displayProducts.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-md border border-[var(--color-border)]"
              >
                <div className="aspect-square bg-[var(--color-bg-secondary)]" />
                <div className="space-y-2 p-4">
                  <div className="skeleton-shimmer h-4 w-3/4 rounded-sm" />
                  <div className="skeleton-shimmer h-5 w-1/3 rounded-sm" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Categories Grid */}
      {categories.length > 0 && (
        <section className="container-content pb-12 md:pb-16">
          <h2 className="mb-8 text-h2 text-[var(--color-text-primary)]">Shop by Category</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.slice(0, 4).map((category: any) => (
              <Link
                key={category._id}
                href={`/products?categoryId=${category._id}`}
                className="group relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-md bg-[var(--color-bg-secondary)]"
              >
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-accent)] opacity-30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <h3 className="relative z-10 text-h3 font-bold text-white">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
