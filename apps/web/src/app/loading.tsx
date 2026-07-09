import { Skeleton } from '@/components/ui/Skeleton';

export default function RootLoading() {
  return (
    <div className="container-content py-8">
      {/* Hero skeleton */}
      <div className="mb-12 h-[320px] md:h-[480px]">
        <Skeleton variant="custom" className="h-full w-full rounded-md" />
      </div>

      {/* Featured products skeleton */}
      <div className="mb-8">
        <Skeleton variant="text" className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-md border border-[var(--color-border)]">
              <Skeleton variant="image" className="aspect-square" />
              <div className="space-y-2 p-4">
                <Skeleton variant="text" className="h-4 w-3/4" />
                <Skeleton variant="text" className="h-5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
