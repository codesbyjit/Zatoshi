'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/categories', label: 'Categories', icon: FolderTree },
];

interface AdminSidebarProps {
  mobileMenuOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ mobileMenuOpen = false, onMobileClose, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  if (pathname === '/login') return null;

  return (
    <>
      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen sidebar-glass z-[300] flex flex-col transition-transform duration-300 md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + Close */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[var(--sidebar-bg-active)] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[var(--sidebar-text)]">A</span>
            </div>
            <span className="text-lg font-semibold text-[var(--sidebar-text)]">Admin</span>
          </div>
          <button
            onClick={onMobileClose}
            className="flex items-center justify-center w-8 h-8 rounded-sm text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={clsx(
                  'flex items-center gap-3 h-10 px-3 rounded-sm text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text)]'
                    : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)]',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-[var(--sidebar-border)] p-3">
          {user && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-[var(--sidebar-bg-active)] flex items-center justify-center text-xs font-bold text-[var(--sidebar-text)]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--sidebar-text)] truncate">{user.name}</p>
                <p className="text-xs text-[var(--sidebar-text-muted)] truncate">{user.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-3 h-10 px-3 rounded-sm text-sm font-medium text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)] transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen sidebar-glass z-[300] flex-col transition-all duration-200 hidden md:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo area */}
        <div className="flex items-center h-16 px-4 border-b border-[var(--sidebar-border)]">
          <div className={clsx('flex items-center gap-3', collapsed && 'justify-center w-full')}>
            <div className="w-8 h-8 rounded-md bg-[var(--sidebar-bg-active)] flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[var(--sidebar-text)]">A</span>
            </div>
            {!collapsed && <span className="text-lg font-semibold text-[var(--sidebar-text)]">Admin</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 h-10 px-3 rounded-sm text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text)]'
                    : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)]',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-[var(--sidebar-border)] p-3">
          {!collapsed && user && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-[var(--sidebar-bg-active)] flex items-center justify-center text-xs font-bold text-[var(--sidebar-text)]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--sidebar-text)] truncate">{user.name}</p>
                <p className="text-xs text-[var(--sidebar-text-muted)] truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={clsx(
              'flex items-center gap-3 w-full h-10 px-3 rounded-sm text-sm font-medium text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)] transition-colors',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          <div className={clsx('flex items-center mt-2', collapsed ? 'justify-center' : 'justify-between')}>
            {/* Collapse toggle */}
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center h-8 w-8 rounded-sm text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text)] transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            {!collapsed && <ThemeToggle />}
          </div>
        </div>
      </aside>
    </>
  );
}
