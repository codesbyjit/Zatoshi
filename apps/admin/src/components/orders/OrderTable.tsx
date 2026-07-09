'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye } from 'lucide-react';
import { Table, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { OrderStatusBadge, PaymentStatusBadge } from './StatusBadge';
import type { OrderStatus, PaymentStatus } from '@repo/types';

interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  date: string;
  itemCount: number;
  total: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}

interface OrderTableProps {
  orders: OrderItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onStatusFilter: (status: string) => void;
  isLoading?: boolean;
}

export function OrderTable({
  orders,
  total,
  page,
  pageSize,
  onPageChange,
  onSearch,
  onStatusFilter,
  isLoading,
}: OrderTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const totalPages = Math.ceil(total / pageSize);

  const columns: Column<OrderItem>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (item) => <span className="font-mono text-sm">{item.orderNumber}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (item) => <span className="text-sm">{item.customerName}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item) => <span className="text-sm text-[var(--color-text-muted)]">{item.date}</span>,
    },
    {
      key: 'itemCount',
      header: 'Items',
      render: (item) => <span className="text-sm">{item.itemCount}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      render: (item) => <span className="text-sm font-medium">${item.total.toFixed(2)}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (item) => <PaymentStatusBadge status={item.paymentStatus} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => <OrderStatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => router.push(`/orders/${item.id}`)}
            className="h-8 w-8 flex items-center justify-center rounded-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
            title="View order"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by order #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch(e.target.value);
            }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            onStatusFilter(e.target.value);
          }}
          className="input-field w-44"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={orders}
        keyExtractor={(o) => o.id}
        onRowClick={(item) => router.push(`/orders/${item.id}`)}
        isLoading={isLoading}
        emptyMessage="No orders found"
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
