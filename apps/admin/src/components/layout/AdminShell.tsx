'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors duration-200">
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[250] bg-[var(--color-overlay)] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <AdminSidebar
        mobileMenuOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className={clsx('ml-0 transition-all duration-300', collapsed ? 'md:ml-16' : 'md:ml-64')}>
        <AdminHeader onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
