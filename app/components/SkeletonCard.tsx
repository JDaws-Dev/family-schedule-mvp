export const SkeletonCard = () => (
  <div className="bg-white rounded-lg p-6 shadow-md animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

export const SkeletonEventCard = () => (
  <div className="bg-white rounded-2xl p-5 shadow-md animate-pulse border-2 border-gray-100">
    <div className="flex gap-4">
      {/* Icon skeleton */}
      <div className="flex-shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-gray-200"></div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 min-w-0">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>

        {/* Tags skeleton */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonActivityCard = () => (
  <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
    </div>

    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>

    <div className="flex gap-2 mb-4">
      <div className="h-8 bg-gray-200 rounded w-20"></div>
      <div className="h-8 bg-gray-200 rounded w-24"></div>
    </div>

    <div className="flex gap-3">
      <div className="h-10 bg-gray-200 rounded flex-1"></div>
      <div className="h-10 bg-gray-200 rounded flex-1"></div>
    </div>
  </div>
);

export const SkeletonBibleVerse = () => (
  <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-6 shadow-md animate-pulse">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 bg-primary-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-primary-200 rounded w-1/3 mb-2"></div>
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-primary-200 rounded w-full"></div>
      <div className="h-4 bg-primary-200 rounded w-5/6"></div>
      <div className="h-4 bg-primary-200 rounded w-4/5"></div>
    </div>
    <div className="h-3 bg-primary-200 rounded w-1/4"></div>
  </div>
);

export const SkeletonStatCard = () => (
  <div className="bg-white rounded-xl p-6 shadow-md animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
  </div>
);
