'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { useAdminAuth } from '@/lib/auth';

const breadcrumbLabels: Record<string, string> = {
  '': 'Dashboard',
  'products': 'Products',
  'orders': 'Orders',
  'users': 'Users',
  'categories': 'Categories',
  'new': 'New',
  'edit': 'Edit',
};

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const { user } = useAdminAuth();

  if (pathname === '/login') return null;

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => {
    const label = breadcrumbLabels[seg] || seg;
    const href = '/' + segments.slice(0, i + 1).join('/');
    return { label, href, isLast: i === segments.length - 1 };
  });

  // If on dashboard, show a simpler breadcrumb
  if (segments.length === 0) {
    breadcrumbs.push({ label: 'Dashboard', href: '/', isLast: true });
  }

  return (
    <header className="h-14 bg-[var(--color-card)] border-b border-[var(--color-border)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-[100] transition-colors duration-200">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="flex md:hidden items-center justify-center h-9 w-9 mr-1 rounded-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {!crumb.isLast ? (
              <a href={crumb.href} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors truncate">
                {crumb.label}
              </a>
            ) : (
              <span className="text-[var(--color-text-primary)] font-medium truncate">{crumb.label}</span>
            )}
            {!crumb.isLast && <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)] flex-shrink-0" />}
          </span>
        ))}
      </nav>

      {/* User area */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-xs font-bold text-[var(--color-text-inverse)]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-[var(--color-text-primary)] hidden sm:inline">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
