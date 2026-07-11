/**
 * Content-based similarity service.
 *
 * Computes similarity between products using:
 * - Jaccard index on tags
 * - Category match bonus
 * - Text similarity on name + description
 */
import type { Product } from '@repo/types';
import { embedText, cosineSimilarity, tokenize } from '../utils/embeddings';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:similarity-service');

// ── Jaccard Similarity ──────────────────────────────────────────────

/**
 * Compute Jaccard similarity between two sets.
 * Returns 0–1 where 1 = identical sets.
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Composite Score ─────────────────────────────────────────────────

export interface SimilarityResult {
  productId: string;
  score: number;
}

/**
 * Compute a composite similarity score between two products.
 *
 * Weights (summing to 1.0):
 * - Tags (Jaccard): 0.40
 * - Category match: 0.30
 * - Name/description (cosine): 0.30
 */
export function computeProductSimilarity(
  productA: Product,
  productB: Product,
): number {
  // 1. Tag similarity (Jaccard)
  const tagsA = new Set(productA.tags || []);
  const tagsB = new Set(productB.tags || []);
  const tagScore = jaccardSimilarity(tagsA, tagsB);

  // 2. Category match
  const categoryScore =
    productA.categoryId === productB.categoryId ? 1 : 0;

  // 3. Text similarity (name + description)
  const textA = `${productA.name} ${productA.description || ''}`;
  const textB = `${productB.name} ${productB.description || ''}`;
  const vecA = embedText(textA);
  const vecB = embedText(textB);
  const textScore = cosineSimilarity(vecA, vecB);

  // Weighted composite
  const score = tagScore * 0.4 + categoryScore * 0.3 + textScore * 0.3;

  logger.debug(
    {
      productA: productA._id,
      productB: productB._id,
      tagScore,
      categoryScore,
      textScore,
      composite: score,
    },
    'Product similarity computed',
  );

  return score;
}

/**
 * Find the top N most similar products to a given product.
 *
 * @param target - The reference product
 * @param candidates - Pool of candidate products (should exclude the target itself)
 * @param limit - Max results to return
 * @returns Sorted array of { productId, score }
 */
export function findSimilarProducts(
  target: Product,
  candidates: Product[],
  limit: number = 10,
): SimilarityResult[] {
  const scored: SimilarityResult[] = [];

  for (const candidate of candidates) {
    // Skip the target itself
    if (candidate._id === target._id) continue;

    const score = computeProductSimilarity(target, candidate);
    if (score > 0) {
      scored.push({ productId: candidate._id, score });
    }
  }

  // Sort descending by score, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
