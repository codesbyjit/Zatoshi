'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { ProductForm } from '@/components/products/ProductForm';
import { useToast } from '@/components/ui/Toast';
import { trpcCall } from '@/lib/trpc';

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  categoryId: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  variants: Array<{
    name: string;
    sku: string;
    price?: number;
    inventory: number;
  }>;
}

interface FormInitialData {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  categoryId: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  variants: Array<{
    name: string;
    sku: string;
    price: string;
    inventory: string;
  }>;
}

export default function EditProductPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [product, setProduct] = useState<FormInitialData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !params.id) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const id = params.id as string;
        const [prod, cats] = await Promise.all([
          trpcCall<ApiProduct>('GET:product.getById', { id }),
          trpcCall<Array<{ _id: string; name: string }>>('GET:category.list', {}),
        ]);

        setCategories((cats || []).map((c) => ({ value: c._id, label: c.name })));

        setProduct({
          name: prod.name,
          slug: prod.slug,
          description: prod.description,
          price: String(prod.price),
          compareAtPrice: prod.compareAtPrice ? String(prod.compareAtPrice) : '',
          categoryId: prod.categoryId,
          tags: prod.tags || [],
          isActive: prod.isActive,
          isFeatured: prod.isFeatured,
          images: prod.images || [],
          variants: (prod.variants || []).map((v) => ({
            name: v.name,
            sku: v.sku,
            price: v.price !== undefined && v.price !== null ? String(v.price) : '',
            inventory: String(v.inventory),
          })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, params.id]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    const variants = data.variants as
      | Array<{ name: string; sku: string; price?: string | number; inventory: string | number }>
      | undefined;

    // Compute top-level inventory from variants sum
    data.inventory =
      variants?.reduce((sum, v) => sum + Number(v.inventory || 0), 0) || 0;

    await trpcCall('product.update', { id: params.id, data });

    addToast({
      title: 'Product updated',
      message: 'The product has been updated successfully.',
      variant: 'success',
    });
    router.push('/products');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-sm bg-[#fef2f2] border border-[#fecaca] text-sm text-[#dc2626]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000]">Edit Product</h1>
        <p className="text-sm text-[#737373] mt-1">ID: {params.id}</p>
      </div>

      {product && (
        <ProductForm
          initialData={product}
          categories={categories}
          onSubmit={handleSubmit}
          isEditing
        />
      )}
    </div>
  );
}
