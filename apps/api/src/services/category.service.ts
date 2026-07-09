import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  CATEGORY_COLLECTION,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@repo/types';

const logger = getLogger('api:category-service');

/**
 * Convert a string ID to ObjectId if it matches MongoDB's 24-hex-char format.
 * This allows querying categories seeded with ObjectIds as well as those created
 * as string UUIDs via `randomUUID()`.
 */
function toObjectId(id: string): ObjectId | string {
  if (/^[a-f0-9]{24}$/i.test(id)) {
    return new ObjectId(id);
  }
  return id;
}

/** Helper to build a filter match for `_id` that accepts both string and ObjectId. */
function idFilter(id: string): Record<string, unknown> {
  return { _id: toObjectId(id) };
}

/** Helper to build a filter match for `_id` with $ne. */
function idNotFilter(id: string): Record<string, unknown> {
  return { _id: { $ne: toObjectId(id) } };
}

/**
 * List all categories, sorted by sortOrder.
 */
export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const categories = db.collection<Category>(CATEGORY_COLLECTION);
  return categories.find().sort({ sortOrder: 1 }).toArray();
}

/**
 * Get a single category by ID.
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const db = getDb();
  const categories = db.collection<Category>(CATEGORY_COLLECTION);
  return categories.findOne(idFilter(id));
}

/**
 * Create a new category (admin only).
 */
export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const db = getDb();
  const categories = db.collection<Category>(CATEGORY_COLLECTION);

  // Check slug uniqueness
  const existing = await categories.findOne({ slug: input.slug });
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Category with slug "${input.slug}" already exists`,
    });
  }

  const now = new Date();
  const category: Category = {
    _id: randomUUID(),
    ...input,
    createdAt: now,
  };

  await categories.insertOne(category);

  logger.info({ categoryId: category._id, name: category.name }, 'Category created');

  return category;
}

/**
 * Update an existing category (admin only).
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const db = getDb();
  const categories = db.collection<Category>(CATEGORY_COLLECTION);

  // Check slug uniqueness if changing
  if (input.slug) {
    const existing = await categories.findOne({
      slug: input.slug,
      ...idNotFilter(id),
    });
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Category with slug "${input.slug}" already exists`,
      });
    }
  }

  const result = await categories.findOneAndUpdate(
    idFilter(id),
    { $set: input },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Category not found',
    });
  }

  logger.info({ categoryId: id }, 'Category updated');

  return result;
}

/**
 * Delete a category (admin only).
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = getDb();
  const categories = db.collection<Category>(CATEGORY_COLLECTION);

  const result = await categories.deleteOne(idFilter(id));
  if (result.deletedCount === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Category not found',
    });
  }

  logger.info({ categoryId: id }, 'Category deleted');
}
