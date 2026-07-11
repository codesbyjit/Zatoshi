'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { trpcCall } from '@/lib/trpc';
import { Star } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

type TabId = 'trending' | 'popular';

interface TabDefinition {
  id: TabId;
  label: string;
  endpoint: string;
}

interface ProductRankItem {
  id: string;
  name: string;
  rating: number;
  views: number;
  purchases: number;
  reviewCount: number;
}

// ── Tabs ───────────────────────────────────────────────────

const TABS: TabDefinition[] = [
  { id: 'trending', label: 'Trending', endpoint: 'GET:recommendation.trending' },
  { id: 'popular', label: 'Popular', endpoint: 'GET:recommendation.popular' },
];

// ── Helpers ────────────────────────────────────────────────

function formatCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * Normalise raw API data into the uniform ProductRankItem shape.
 * Handles both ProductAnalytics (trending) and Product (popular) response shapes.
 */
function normalizeItems(raw: unknown[], tabId: TabId): ProductRankItem[] {
  return raw.map((item: any, i) => {
    const id = item._id ?? '';

    if (tabId === 'trending') {
      // ProductAnalytics shape: _id = productId, totalViews, purchases, productRating, reviewCount
      return {
        id,
        name: id, // analytics docs have no product name; fallback to id
        rating: item.productRating ?? 0,
        views: item.totalViews ?? 0,
        purchases: item.purchases ?? 0,
        reviewCount: item.reviewCount ?? 0,
      };
    }

    // Product shape: _id, name, rating, reviewCount
    return {
      id,
      name: item.name ?? id,
      rating: item.rating ?? 0,
      views: 0,
      purchases: 0,
      reviewCount: item.reviewCount ?? 0,
    };
  });
}

// ── Rank badge colour ──────────────────────────────────────

function rankClass(index: number): string {
  if (index === 0) return 'bg-yellow-500/20 text-yellow-500';
  if (index === 1) return 'bg-slate-400/20 text-slate-400';
  if (index === 2) return 'bg-amber-700/20 text-amber-700';
  return 'text-[var(--color-text-muted)]';
}

// ── Component ──────────────────────────────────────────────

export function TopProducts() {
  const [activeTab, setActiveTab] = useState<TabId>('trending');
  const [items, setItems] = useState<ProductRankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tab = TABS.find((t) => t.id === activeTab)!;
      const data = await trpcCall<unknown[]>(tab.endpoint, { limit: 10 });
      setItems(normalizeItems(data, activeTab));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load top products');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="card p-4">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          Top Products
        </h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
          {TABS.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      {/* ── Content ────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-sm bg-[var(--color-error-bg)] border border-[var(--color-border)] p-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">
          No data available
        </div>
      ) : (
        <div className="space-y-0.5">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              {/* Rank badge */}
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${rankClass(i)}`}
              >
                {i + 1}
              </span>

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.id}/edit`}
                  className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate block"
                >
                  {item.name === item.id
                    ? `Product ${item.id.slice(-8)}`
                    : item.name}
                </Link>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {activeTab === 'trending' && (
                    <>
                      <span>{formatCount(item.views)} views</span>
                      <span className="mx-1">•</span>
                      <span>{formatCount(item.purchases)} purchases</span>
                      <span className="mx-1">•</span>
                    </>
                  )}
                  <span>{formatCount(item.reviewCount)} reviews</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {item.rating.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ──────────────────────────────── */}
      <div className="flex gap-1 mt-4 pt-3 border-t border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
