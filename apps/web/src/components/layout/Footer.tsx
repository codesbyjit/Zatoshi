import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="container-content py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-h3 font-bold text-[var(--color-text-primary)] no-underline"
            >
              STORE
            </Link>
            <p className="mt-3 text-sm text-[var(--color-text-muted)] max-w-[65ch]">
              Premium e-commerce platform offering quality products with exceptional customer service.
              Shop with confidence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm-medium mb-3 text-[var(--color-text-primary)]">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: '/products', label: 'All Products' },
                { href: '/products', label: 'New Arrivals' },
                { href: '/products', label: 'Sale' },
                { href: '/orders', label: 'Track Order' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-muted)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm-medium mb-3 text-[var(--color-text-primary)]">Support</h3>
            <ul className="space-y-2">
              {[
                { href: '#', label: 'Help Center' },
                { href: '#', label: 'Shipping Info' },
                { href: '#', label: 'Returns & Exchanges' },
                { href: '#', label: 'Contact Us' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-muted)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social / Newsletter */}
          <div>
            <h3 className="text-sm-medium mb-3 text-[var(--color-text-primary)]">Follow Us</h3>
            <div className="flex gap-3">
              {['Twitter', 'Instagram', 'Facebook'].map((platform) => (
                <Link
                  key={platform}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors duration-150 hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
                  aria-label={platform}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" />
                  </svg>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-caption text-[var(--color-text-muted)]">
              Subscribe for exclusive offers and new arrivals.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-[var(--color-border)] pt-6 text-center text-sm text-[var(--color-text-muted)]">
          <p>&copy; {new Date().getFullYear()} STORE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
