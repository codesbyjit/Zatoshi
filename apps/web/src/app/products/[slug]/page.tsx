import { notFound } from 'next/navigation';
import { ProductDetailContent } from './ProductDetailContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getProduct(slug: string) {
  try {
    const res = await fetch(
      `${API_URL}/trpc/product.getBySlug?input=${encodeURIComponent(JSON.stringify({ slug }))}`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    return data?.result?.data || null;
  } catch {
    return null;
  }
}

async function getRelatedProducts(categoryId: string) {
  try {
    const res = await fetch(
      `${API_URL}/trpc/product.list?input=${encodeURIComponent(JSON.stringify({
        categoryId,
        limit: 4,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }))}`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    return data?.result?.data?.items || [];
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  let relatedProducts: any[] = [];
  if (product.categoryId) {
    relatedProducts = await getRelatedProducts(product.categoryId);
    relatedProducts = relatedProducts.filter((p: any) => p._id !== product._id).slice(0, 4);
  }

  return (
    <div className="container-content py-8">
      <ProductDetailContent product={product} relatedProducts={relatedProducts} />
    </div>
  );
}
