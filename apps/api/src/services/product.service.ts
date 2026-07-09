import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';
import { getLogger } from '@repo/utils';
import {
  PRODUCT_COLLECTION,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from '@repo/types';

const logger = getLogger('api:product-service');

export interface ProductListFilters {
  categoryId?: string;
  search?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  isFeatured?: boolean;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * List products with pagination, filtering, and search.
 */
export async function listProducts(
  filters: ProductListFilters,
): Promise<ProductListResult> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);

  const {
    categoryId,
    search,
    tags,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
    includeInactive,
    isFeatured,
  } = filters;

  // Build query
  // Include inactive products only when explicitly requested (admin view)
  const query: Record<string, unknown> = {};
  if (!includeInactive) {
    query.isActive = true;
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured;
  }

  if (categoryId) {
    query.categoryId = categoryId;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) (query.price as any).$gte = minPrice;
    if (maxPrice !== undefined) (query.price as any).$lte = maxPrice;
  }

  // If search is provided, use text search
  let cursor;
  if (search && search.trim()) {
    cursor = products.find(
      { $text: { $search: search.trim() }, ...query },
      { projection: { score: { $meta: 'textScore' } } },
    );
    cursor = cursor.sort({ score: { $meta: 'textScore' } });
  } else {
    cursor = products.find(query);
    // Apply sorting
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    cursor = cursor.sort({ [sortBy]: sortDir });
  }

  const skip = (page - 1) * limit;
  cursor = cursor.skip(skip).limit(limit);

  const [items, total] = await Promise.all([
    cursor.toArray(),
    products.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single product by slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  return products.findOne({ slug, isActive: true });
}

/**
 * Convert a string ID to ObjectId if it matches MongoDB's 24-hex-char format.
 * This allows querying products seeded with ObjectIds as well as those created
 * as string UUIDs via `randomUUID()`.
 */
function toObjectId(id: string): ObjectId | string {
  if (/^[a-f0-9]{24}$/i.test(id)) {
    return new ObjectId(id);
  }
  return id;
}

/** Helper to build a Record filter match for `_id` that accepts both string and ObjectId. */
function idFilter(id: string): Record<string, unknown> {
  return { _id: toObjectId(id) };
}

/** Helper for `_id: { $ne: ... }` that handles both string and ObjectId. */
function idNotFilter(id: string): Record<string, unknown> {
  return { _id: { $ne: toObjectId(id) } };
}

/**
 * Get a single product by ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  return products.findOne(idFilter(id));
}

/**
 * Create a new product (admin only).
 */
export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);

  // Check slug uniqueness
  const existing = await products.findOne({ slug: input.slug });
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Product with slug "${input.slug}" already exists`,
    });
  }

  const now = new Date();
  const product: Product = {
    _id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await products.insertOne(product);

  logger.info({ productId: product._id, name: product.name }, 'Product created');

  return product;
}

/**
 * Update an existing product (admin only).
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);

  // Check if slug is being changed and if it's taken
  if (input.slug) {
    const existing = await products.findOne({
      slug: input.slug,
      ...idNotFilter(id),
    });
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Product with slug "${input.slug}" already exists`,
      });
    }
  }

  const result = await products.findOneAndUpdate(
    idFilter(id),
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Product not found',
    });
  }

  logger.info({ productId: id }, 'Product updated');

  return result;
}

/**
 * Delete a product (admin only) — hard delete.
 */
export async function deleteProduct(id: string): Promise<void> {
  const db = getDb();
  const products = db.collection<Product>(PRODUCT_COLLECTION);

  const result = await products.deleteOne(idFilter(id));
  if (result.deletedCount === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Product not found',
    });
  }

  logger.info({ productId: id }, 'Product deleted');
}
