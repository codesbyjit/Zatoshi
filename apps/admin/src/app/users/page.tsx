'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { UserTable } from '@/components/users/UserTable';
import { trpcCall } from '@/lib/trpc';
import { useToast } from '@/components/ui/Toast';

// ──────────────────────────────────────────
// API types matching backend SafeUser
// ──────────────────────────────────────────

interface ApiUser {
  _id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  orderCount?: number;
}

interface ApiUserListResponse {
  items: ApiUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ──────────────────────────────────────────
// Table-level user item
// ──────────────────────────────────────────

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  ordersCount: number;
  joinedDate: string;
}

function formatDate(raw: Date | string): string {
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function UsersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const pageSize = 10;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const input: Record<string, unknown> = {
        page,
        limit: pageSize,
      };
      if (search) input.search = search;
      if (roleFilter) input.role = roleFilter;

      const result = await trpcCall<ApiUserListResponse>(
        'GET:user.list',
        input,
      );

      const mapped: UserItem[] = (result.items || []).map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        ordersCount: u.orderCount ?? 0,
        joinedDate: formatDate(u.createdAt),
      }));

      setUsers(mapped);
      setTotal(result.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load users';
      setError(msg);
      addToast({ title: 'Error', message: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, addToast]);

  useEffect(() => {
    if (isAuthenticated) fetchUsers();
  }, [isAuthenticated, fetchUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleRoleChange = async (userId: string, role: 'customer' | 'admin') => {
    try {
      await trpcCall('user.updateRole', { userId, role });
      addToast({
        title: 'Role updated',
        message: `User role changed to ${role}`,
        variant: 'success',
      });
      await fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      addToast({ title: 'Error', message: msg, variant: 'error' });
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await trpcCall('user.delete', { userId });
      addToast({
        title: 'User deleted',
        message: 'The user has been deleted.',
        variant: 'success',
      });
      await fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      addToast({ title: 'Error', message: msg, variant: 'error' });
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Users</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{total} total</p>
      </div>

      {error && (
        <div className="p-3 rounded-sm bg-[var(--color-error-bg)] border border-[var(--color-border)] text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <UserTable
        users={users}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onSearch={handleSearch}
        onRoleFilter={handleRoleFilter}
        onRoleChange={handleRoleChange}
        onDelete={handleDelete}
        isLoading={loading}
      />
    </div>
  );
}
