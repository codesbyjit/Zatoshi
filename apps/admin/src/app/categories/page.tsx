'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { trpcCall } from '@/lib/trpc';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  sortOrder: '0',
};

export default function CategoriesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const pageSize = 10;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await trpcCall<Category[]>('GET:category.list');
      setCategories(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated, authLoading, fetchCategories]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openAddModal = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parentId: cat.parentId || '',
      sortOrder: String(cat.sortOrder),
    });
    setModalOpen(true);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: editingCategory ? prev.slug : generateSlug(value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingCategory) {
        // Update existing category
        const data: Record<string, unknown> = {};
        if (form.name !== editingCategory.name) data.name = form.name;
        if (form.slug !== editingCategory.slug) data.slug = form.slug;
        if (form.description !== (editingCategory.description || '')) data.description = form.description || undefined;
        if ((form.parentId || null) !== (editingCategory.parentId || null)) data.parentId = form.parentId || undefined;
        if (Number(form.sortOrder) !== editingCategory.sortOrder) data.sortOrder = Number(form.sortOrder);

        await trpcCall('category.update', { id: editingCategory._id, data });
        addToast({
          title: 'Category updated',
          message: `Category "${form.name}" has been updated.`,
          variant: 'success',
        });
      } else {
        // Create new category
        await trpcCall(
          'category.create',
          {
            name: form.name,
            slug: form.slug,
            description: form.description || undefined,
            parentId: form.parentId || undefined,
            sortOrder: Number(form.sortOrder),
          },
        );
        addToast({
          title: 'Category created',
          message: `Category "${form.name}" has been created.`,
          variant: 'success',
        });
      }
      setModalOpen(false);
      await fetchCategories();
    } catch (err) {
      addToast({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Operation failed',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await trpcCall('category.delete', { id: deleteTarget._id });
      addToast({
        title: 'Category deleted',
        message: `Category "${deleteTarget.name}" has been deleted.`,
        variant: 'success',
      });
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      addToast({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete category',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Compute children counts for display
  const getChildrenCount = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId).length;

  const paginated = categories.slice((page - 1) * pageSize, page * pageSize);

  // Options for parent category dropdown (exclude self when editing)
  const parentOptions = categories
    .filter((c) => !editingCategory || c._id !== editingCategory._id)
    .map((c) => ({ value: c._id, label: c.name }));

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#000]">Categories</h1>
            <p className="text-sm text-[#737373] mt-1">Loading categories...</p>
          </div>
        </div>
        <div className="card p-12 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#000]">Categories</h1>
          </div>
        </div>
        <div className="card p-12 text-center">
          <p className="text-[#dc2626] mb-4">{error}</p>
          <Button variant="primary" onClick={fetchCategories}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#000]">Categories</h1>
          <p className="text-sm text-[#737373] mt-1">
            {categories.length} total
            <button
              onClick={fetchCategories}
              className="ml-2 inline-flex items-center text-[#2563eb] hover:text-[#1d4ed8]"
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Table */}
      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[#737373] mb-4">No categories found</p>
          <Button variant="primary" onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Add your first category
          </Button>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#737373]">Parent</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Subcategories</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Sort Order</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#737373]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((cat) => {
                  const parentName = cat.parentId
                    ? categories.find((c) => c._id === cat.parentId)?.name || '-'
                    : '-';
                  return (
                    <tr key={cat._id} className="border-b border-[#e5e5e5] hover:bg-[#f5f5f5] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#000]">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-[#737373] mt-0.5">{cat.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#737373]">{cat.slug}</td>
                      <td className="px-4 py-3 text-sm text-[#737373]">{parentName}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Badge variant="default">{getChildrenCount(cat._id)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#737373]">{cat.sortOrder}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="h-8 w-8 flex items-center justify-center rounded-sm text-[#737373] hover:text-[#2563eb] hover:bg-[#eff6ff] transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="h-8 w-8 flex items-center justify-center rounded-sm text-[#737373] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#737373]">
                      No categories match this page
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={Math.ceil(categories.length / pageSize)}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name || !form.slug}>
              {editingCategory ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1a1a1a]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="input-field h-auto min-h-[60px] resize-y py-3"
            />
          </div>
          <Select
            label="Parent Category"
            options={parentOptions}
            placeholder="None (Top Level)"
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          />
          <Input
            label="Sort Order"
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isLoading={deleting}
      />
    </div>
  );
}
