/**
 * Loading skeleton components for better UX
 */

export const SkeletonCard = () => (
  <div className="animate-pulse bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
    </div>
  </div>
)

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="animate-pulse">
    {/* Table header */}
    <div className="grid grid-cols-5 gap-4 mb-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-t-md">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
      ))}
    </div>

    {/* Table rows */}
    {[...Array(rows)].map((_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        {[...Array(5)].map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    ))}
  </div>
)

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, index) => (
      <div key={index} className="animate-pulse flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
)

export const SkeletonStats = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[...Array(3)].map((_, index) => (
      <div key={index} className="animate-pulse bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    ))}
  </div>
)

export default {
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats
}
