'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch?: () => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery('');
      onSearch?.();
      inputRef.current?.blur();
    }
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative w-full" role="search">
      <div
        className={cn(
          'relative flex items-center rounded-sm border transition-all duration-150',
          isFocused
            ? 'border-[var(--color-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_40%,transparent)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="ml-2.5 shrink-0 text-[var(--color-text-muted)]"
          aria-hidden="true"
        >
          <circle cx="6.5" cy="6.5" r="4.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-8 w-full border-none bg-transparent px-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          aria-label="Search products"
        />
      </div>
    </form>
  );
}
