import { cn } from '@/lib/utils';

export interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const sizeMap: Record<string, { size: number; text: string }> = {
  sm: { size: 14, text: 'text-sm' },
  md: { size: 16, text: 'text-sm' },
  lg: { size: 20, text: 'text-body' },
};

export function StarRating({
  rating,
  reviewCount,
  size = 'md',
  showCount = true,
}: StarRatingProps) {
  const { size: starSize, text } = sizeMap[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center gap-[2px]" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg
            key={`full-${i}`}
            width={starSize}
            height={starSize}
            viewBox="0 0 20 20"
            fill="#f59e0b"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg width={starSize} height={starSize} viewBox="0 0 20 20" aria-hidden="true">
            <defs>
              <linearGradient id={`half-${rating}`}>
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="var(--color-border)" />
              </linearGradient>
            </defs>
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              fill={`url(#half-${rating})`}
            />
          </svg>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg
            key={`empty-${i}`}
            width={starSize}
            height={starSize}
            viewBox="0 0 20 20"
            fill="var(--color-border)"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {showCount && reviewCount !== undefined && (
        <span className={cn('text-[var(--color-text-muted)]', text)}>({reviewCount})</span>
      )}
    </div>
  );
}
