'use client';

import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  ordersCount: number;
  joinedDate: string;
}

interface UserTableProps {
  users: UserItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onRoleFilter: (role: string) => void;
  onRoleChange: (userId: string, role: 'customer' | 'admin') => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  isLoading?: boolean;
}

export function UserTable({
  users,
  total,
  page,
  pageSize,
  onPageChange,
  onSearch,
  onRoleFilter,
  onRoleChange,
  onDelete,
  isLoading,
}: UserTableProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const columns: Column<UserItem>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.name}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{item.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (item) => (
        <Badge variant={item.role === 'admin' ? 'accent' : 'default'}>
          {item.role === 'admin' ? 'Admin' : 'Customer'}
        </Badge>
      ),
    },
    {
      key: 'ordersCount',
      header: 'Orders',
      render: (item) => <span className="text-sm">{item.ordersCount}</span>,
    },
    {
      key: 'joinedDate',
      header: 'Joined',
      sortable: true,
      render: (item) => <span className="text-sm text-[var(--color-text-muted)]">{item.joinedDate}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <select
            value={item.role}
            onChange={(e) => onRoleChange(item.id, e.target.value as 'customer' | 'admin')}
            className="input-field h-8 text-sm w-28"
          >
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => setDeleteTarget(item)}
            className="h-8 w-8 flex items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'w-48',
    },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch(e.target.value);
            }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            onRoleFilter(e.target.value);
          }}
          className="input-field w-40"
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteTarget?.name}? All of their data will be permanently removed.`}
        confirmLabel="Delete"
        isLoading={deleteLoading}
      />
    </div>
  );
}
