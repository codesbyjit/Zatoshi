'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[var(--color-skeleton)] rounded-sm animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  isLoading,
  emptyMessage = 'No items found',
  className,
  selectedIds,
  onSelect,
  onSelectAll,
  allSelected,
}: TableProps<T>) {
  const showCheckbox = !!onSelect;
  const allCols = columns;

  return (
    <div className={clsx('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              {showCheckbox && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded-sm border-[var(--color-border)]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-[var(--color-text-muted)]',
                    col.sortable && 'cursor-pointer select-none hover:bg-[var(--color-bg-tertiary)]',
                    col.className,
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-3 w-3 text-[var(--color-text-primary)]" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-[var(--color-text-primary)]" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-[var(--color-text-muted)]" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={allCols.length + (showCheckbox ? 1 : 0)} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showCheckbox ? 1 : 0)}
                  className="px-4 py-12 text-center text-[var(--color-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds?.has(id);
                return (
                  <tr
                    key={id}
                    className={clsx(
                      'border-b border-[var(--color-border)] transition-colors',
                      onRowClick && 'cursor-pointer',
                      'hover:bg-[var(--color-bg-secondary)]',
                      isSelected && 'bg-[var(--color-accent-light)]',
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {showCheckbox && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelect(id)}
                          className="h-4 w-4 rounded-sm border-[var(--color-border)]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={clsx('px-4 py-3 text-sm text-[var(--color-text-primary)]', col.className)}>
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
