'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, Edit } from 'lucide-react';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  image?: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  isActive: boolean;
}

interface ProductTableProps {
  products: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onCategoryFilter: (category: string) => void;
  onDelete: (ids: string[]) => void;
  categories: string[];
  isLoading?: boolean;
}

export function ProductTable({
  products,
  total,
  page,
  pageSize,
  onPageChange,
  onSearch,
  onCategoryFilter,
  onDelete,
  categories,
  isLoading,
}: ProductTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const columns: Column<ProductItem>[] = [
    {
      key: 'image',
      header: 'Image',
      render: (item) => (
        <div className="w-12 h-12 rounded-sm border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)]">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-xs">N/A</div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.name}</p>
          <p className="text-xs font-mono text-[var(--color-text-muted)]">{item.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <Badge variant="default">{item.category}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (item) => (
        <div>
          <span className="text-sm font-medium">${item.price.toFixed(2)}</span>
          {item.compareAtPrice && (
            <span className="text-xs text-[var(--color-text-muted)] line-through ml-1">${item.compareAtPrice.toFixed(2)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'inventory',
      header: 'Stock',
      sortable: true,
      render: (item) => (
        <span className={`text-sm font-medium ${item.inventory < 10 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]'}`}>
          {item.inventory}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Active' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => router.push(`/products/${item.id}/edit`)}
            className="h-8 w-8 flex items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedIds(new Set([item.id]));
              setDeleteOpen(true);
            }}
            className="h-8 w-8 flex items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteConfirm = () => {
    onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setDeleteOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearch(e.target.value);
              }}
              className="input-field pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              onCategoryFilter(e.target.value);
            }}
            className="input-field w-40"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => router.push('/products/new')}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={products}
        keyExtractor={(p) => p.id}
        onRowClick={(item) => router.push(`/products/${item.id}/edit`)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        isLoading={isLoading}
        emptyMessage="No products found"
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        allSelected={selectedIds.size === products.length}
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Products"
        message={`Are you sure you want to delete ${selectedIds.size} product(s)? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
