'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/providers/ThemeProvider';
import { SearchBar } from '@/components/product/SearchBar';
import { CartDrawer } from './CartDrawer';
import { MobileNav } from './MobileNav';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsCartOpen(false);
    setIsMobileNavOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/orders', label: 'Orders' },
  ];

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-[400] h-14 border-b border-[var(--color-border)] bg-[var(--color-bg)] transition-shadow duration-150 md:h-16',
          isScrolled && 'shadow-sm',
        )}
      >
        <div className="container-content flex h-full items-center justify-between gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] lg:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center text-h3 font-bold text-[var(--color-text-primary)] no-underline transition-colors hover:text-[var(--color-accent)]"
          >
            STORE
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm-medium text-[var(--color-text-muted)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)]',
                  pathname === link.href &&
                    'font-semibold text-[var(--color-text-primary)]',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div className="hidden flex-1 max-w-[240px] lg:block">
            <SearchBar />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 2v2m0 12v2m-8-8h2m12 0h2M4.93 4.93l1.41 1.41m7.32 7.32l1.41 1.41M2 10a8 8 0 1116 0H2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {/* Cart button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-sm text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label={`Cart (${cartCount} items)`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M3 1L1 3v14a2 2 0 002 2h14a2 2 0 002-2V3l-2-2H3z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1 3h18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M14 7a4 4 0 01-8 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              {cartCount > 0 && (
                <Badge variant="accent" size="sm" className="absolute -right-1 -top-1 min-w-[16px] px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </button>

            {/* Account */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-10 items-center gap-2 rounded-sm px-2 text-sm-medium text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 10a4 4 0 100-8 4 4 0 000 8zM2 18c0-4.418 3.582-8 8-8s8 3.582 8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="hidden md:inline">{user?.name}</span>
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[199]"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full z-[200] mt-1 w-48 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-md">
                      <Link
                        href="/orders"
                        className="block px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Orders
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        links={navLinks}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
