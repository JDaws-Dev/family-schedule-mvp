export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="p-6 border-b border-gray-200 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div className="flex items-center gap-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl shadow-medium p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-white/20 rounded-lg"></div>
        <div className="h-5 bg-white/20 rounded-full w-12"></div>
      </div>
      <div className="h-3 bg-white/20 rounded w-20 mb-2"></div>
      <div className="h-10 bg-white/20 rounded w-16 mb-1"></div>
      <div className="h-3 bg-white/20 rounded w-28"></div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* View toggle skeleton */}
      <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
        <div className="flex-1 h-11 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 h-11 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Event cards skeleton */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 last:border-b-0">
            <div className="flex items-start justify-between mb-3">
              <div className="h-6 bg-gray-200 rounded w-40"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="divide-y divide-gray-200">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
