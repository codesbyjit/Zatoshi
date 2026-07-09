import { Skeleton } from '@/components/ui/Skeleton';
import { TextSkeleton } from '@/components/ui/Skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="container-content py-8">
      <div className="mb-6">
        <Skeleton variant="text" className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Skeleton variant="image" className="aspect-square rounded-md" />
        <div className="space-y-4">
          <Skeleton variant="text" className="h-8 w-3/4" />
          <Skeleton variant="text" className="h-5 w-1/3" />
          <Skeleton variant="text" className="h-8 w-1/4" />
          <TextSkeleton lines={3} />
          <Skeleton variant="custom" className="h-10 w-full" />
          <Skeleton variant="custom" className="h-12 w-[240px]" />
        </div>
      </div>
    </div>
  );
}
