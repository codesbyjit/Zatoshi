import { z } from 'zod';

// ──────────────────────────────────────────
// Product Variant Schema (embedded)
// ──────────────────────────────────────────

export const ProductVariantSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  price: z.number().positive().multipleOf(0.01).optional(),
  inventory: z.number().int().min(0),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// ──────────────────────────────────────────
// Product Schema — collection: products
// ──────────────────────────────────────────

export const ProductSchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(250),
  description: z.string().max(5000),
  price: z.number().positive().multipleOf(0.01),
  compareAtPrice: z.number().positive().multipleOf(0.01).optional(),
  categoryId: z.string(),
  images: z.array(
    z.union([z.string().url(), z.string().startsWith('/')]),
  ),
  variants: z.array(ProductVariantSchema),
  inventory: z.number().int().min(0),
  tags: z.array(z.string().max(50)),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductInputSchema = ProductSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

export const UpdateProductInputSchema = CreateProductInputSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

// ──────────────────────────────────────────
// MongoDB metadata
// ──────────────────────────────────────────

export const PRODUCT_COLLECTION = 'products';

export const PRODUCT_INDEXES = [
  { key: { slug: 1 }, unique: true },
  { key: { categoryId: 1 } },
  { key: { isActive: 1, isFeatured: 1 } },
  { key: { tags: 1 } },
  { key: { price: 1 } },
  // Text index on name + description — weights match existing DB index
  { key: { name: 'text', description: 'text' }, weights: { name: 10, description: 5 } },
] as const;
