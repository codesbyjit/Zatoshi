export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div>
        <div className="h-8 w-48 bg-[#e5e5e5] rounded-sm animate-pulse" />
        <div className="h-4 w-64 bg-[#e5e5e5] rounded-sm animate-pulse mt-2" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-[#e5e5e5] animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-20 bg-[#e5e5e5] rounded-sm animate-pulse" />
                <div className="h-7 w-24 bg-[#e5e5e5] rounded-sm animate-pulse mt-2" />
                <div className="h-3 w-28 bg-[#e5e5e5] rounded-sm animate-pulse mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="h-6 w-40 bg-[#e5e5e5] rounded-sm animate-pulse mb-4" />
          <div className="h-[300px] bg-[#e5e5e5] rounded-sm animate-pulse" />
        </div>
        <div className="card p-6">
          <div className="h-6 w-40 bg-[#e5e5e5] rounded-sm animate-pulse mb-4" />
          <div className="h-[300px] bg-[#e5e5e5] rounded-sm animate-pulse" />
        </div>
      </div>
    </div>
  );
}
