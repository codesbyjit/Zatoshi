import { ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function ProductsLoading() {
  return (
    <div className="container-content py-8">
      <div className="mb-6">
        <div className="skeleton-shimmer h-8 w-32 rounded-sm" />
        <div className="skeleton-shimmer mt-2 h-4 w-48 rounded-sm" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
