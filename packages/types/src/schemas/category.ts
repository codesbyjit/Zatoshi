import { z } from 'zod';

// ──────────────────────────────────────────
// Category Schema — collection: categories
// ──────────────────────────────────────────

export const CategorySchema = z.object({
  _id: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().default(0),
  createdAt: z.date(),
});

export type Category = z.infer<typeof CategorySchema>;

export const CreateCategoryInputSchema = CategorySchema.omit({
  _id: true,
  createdAt: true,
});
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const UpdateCategoryInputSchema = CreateCategoryInputSchema.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;

// ──────────────────────────────────────────
// MongoDB metadata
// ──────────────────────────────────────────

export const CATEGORY_COLLECTION = 'categories';

export const CATEGORY_INDEXES = [
  { key: { slug: 1 }, unique: true },
  { key: { parentId: 1 } },
  { key: { sortOrder: 1 } },
] as const;
