'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from './ImageUpload';
import { X, Plus } from 'lucide-react';

interface VariantRow {
  name: string;
  sku: string;
  price: string;
  inventory: string;
}

interface ProductFormProps {
  initialData?: {
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
    variants: VariantRow[];
  };
  categories: { value: string; label: string }[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isEditing?: boolean;
}

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  price: '',
  compareAtPrice: '',
  categoryId: '',
  tagsInput: '',
  isActive: true,
  isFeatured: false,
};

export function ProductForm({ initialData, categories, onSubmit, isEditing }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(
    initialData
      ? { ...defaultForm, ...initialData, tagsInput: initialData.tags.join(', ') }
      : defaultForm,
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [variants, setVariants] = useState<VariantRow[]>(initialData?.variants || []);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: isEditing ? prev.slug : generateSlug(value),
    }));
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', sku: '', price: '', inventory: '0' }]);
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errs.price = 'Valid price is required';
    if (!form.categoryId) errs.categoryId = 'Category is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        categoryId: form.categoryId,
        tags: form.tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        images,
        variants: variants.map((v) => ({
          ...v,
          price: v.price ? Number(v.price) : undefined,
          inventory: Number(v.inventory),
        })),
      });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save product' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {errors.submit && (
        <div className="p-3 rounded-sm bg-[var(--color-error-bg)] border border-[var(--color-border)] text-sm text-[var(--color-error)]">
          {errors.submit}
        </div>
      )}

      {/* General */}
      <section className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">General</h3>
        <Input
          label="Product Name"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          error={errors.name}
          required
        />
        <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} error={errors.slug} required />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]" htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="input-field h-auto min-h-[80px] resize-y py-3"
            placeholder="Product description..."
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Pricing</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            error={errors.price}
            required
          />
          <Input
            label="Compare-at Price"
            type="number"
            step="0.01"
            min="0"
            value={form.compareAtPrice}
            onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
            helperText="Original price for sale display"
          />
        </div>
      </section>

      {/* Category & Tags */}
      <section className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Organization</h3>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]" htmlFor="category">
            Category <span className="text-[var(--color-error)]">*</span>
          </label>
          <select
            id="category"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="input-field"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.categoryId && <span className="text-xs text-[var(--color-error)]">{errors.categoryId}</span>}
        </div>
        <Input
          label="Tags"
          value={form.tagsInput}
          onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
          helperText="Comma-separated (e.g., new, sale, popular)"
        />
      </section>

      {/* Variants */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Variants</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addVariant}>
            <Plus className="h-4 w-4" />
            Add Variant
          </Button>
        </div>
        {variants.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No variants added. The product will use the base price and SKU.</p>
        )}
        {variants.map((variant, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-sm">
            <div className="flex-1 grid grid-cols-4 gap-3">
              <input
                placeholder="Variant name"
                value={variant.name}
                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                className="input-field"
              />
              <input
                placeholder="SKU"
                value={variant.sku}
                onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Price"
                type="number"
                step="0.01"
                value={variant.price}
                onChange={(e) => updateVariant(index, 'price', e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Inventory"
                type="number"
                min="0"
                value={variant.inventory}
                onChange={(e) => updateVariant(index, 'inventory', e.target.value)}
                className="input-field"
              />
            </div>
            <button
              type="button"
              onClick={() => removeVariant(index)}
              className="h-10 w-10 flex items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>

      {/* Images */}
      <section className="card p-6">
        <ImageUpload images={images} onChange={setImages} />
      </section>

      {/* Status */}
      <section className="card p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Status</h3>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded-sm border-[var(--color-border)] text-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              className="h-4 w-4 rounded-sm border-[var(--color-border)] text-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">Featured</span>
          </label>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
