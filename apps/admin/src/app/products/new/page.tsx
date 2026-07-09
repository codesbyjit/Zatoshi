'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/products/ProductForm';
import { useToast } from '@/components/ui/Toast';
import { trpcCall } from '@/lib/trpc';

export default function NewProductPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const cats = await trpcCall<Array<{ _id: string; name: string }>>('GET:category.list', {});
        setCategories((cats || []).map((c) => ({ value: c._id, label: c.name })));
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    })();
  }, [isAuthenticated]);

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
    const inventory =
      variants?.reduce((sum, v) => sum + Number(v.inventory || 0), 0) || 0;

    await trpcCall('product.create', { ...data, inventory });

    addToast({
      title: 'Product created',
      message: 'The product has been created successfully.',
      variant: 'success',
    });
    router.push('/products');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000]">New Product</h1>
        <p className="text-sm text-[#737373] mt-1">Add a new product to your catalog</p>
      </div>

      <ProductForm categories={categories} onSubmit={handleSubmit} />
    </div>
  );
}
