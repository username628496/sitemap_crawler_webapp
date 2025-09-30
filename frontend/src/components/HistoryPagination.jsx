import { ChevronLeft, ChevronRight } from 'lucide-react'

const HistoryPagination = ({ total, limit, offset, onPageChange }) => {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  if (totalPages <= 1) {
    return null
  }

  const getPageNumbers = () => {
    const pages = []
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Info Text */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Trang <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> /{' '}
          <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span> • Tổng{' '}
          <span className="font-medium text-blue-600 dark:text-blue-400">{total}</span> kết quả
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1.5">
          {/* Previous Button */}
          <button
          type="button" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((page) => (
            <button
              type="button" 
              key={page}
              onClick={() => onPageChange(page)}
              className={
                page === currentPage
                  ? 'inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 text-white text-sm focus:outline-none'
                  : 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition'
              }
            >
              {page}
            </button>
          ))}

          {/* Next Button */}
          <button
            type="button" 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            aria-label="Next page"
          >
            <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default HistoryPagination