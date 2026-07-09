import { cn } from '@/lib/utils';

export interface SkeletonProps {
  variant?: 'text' | 'card' | 'image' | 'table-row' | 'avatar' | 'custom';
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({
  variant = 'text',
  className,
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'skeleton-shimmer rounded-sm';

  const variantClasses: Record<string, string> = {
    text: 'h-4 w-full',
    card: 'aspect-square w-full rounded-md',
    image: 'aspect-square w-full rounded-md',
    'table-row': 'h-12 w-full',
    avatar: 'h-10 w-10 rounded-full',
    custom: '',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
      <Skeleton variant="image" className="aspect-square" />
      <div className="space-y-2 p-4">
        <Skeleton variant="text" className="h-4 w-3/4" />
        <Skeleton variant="text" className="h-5 w-1/3" />
        <Skeleton variant="text" className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}
