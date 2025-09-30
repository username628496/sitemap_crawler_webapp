import { X, TrendingUp, CheckCircle, Link2, AlertTriangle, Loader2 } from 'lucide-react'
import { useStatistics } from '../hooks/useStatistics'

const StatisticsModal = ({ onClose }) => {
  const { data: stats, isLoading } = useStatistics(30)

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải thống kê...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={18} />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Thống kê Crawl (30 ngày)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-60px)] space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">Tổng Crawls</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {stats?.basic?.total_crawls || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">Tỷ lệ thành công</p>
              <p className="text-lg font-bold text-green-600">
                {stats?.basic?.success_rate || 0}%
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">Tổng URLs</p>
              <p className="text-lg font-bold text-purple-600">
                {(stats?.basic?.total_urls_found || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500">TB URLs/Crawl</p>
              <p className="text-lg font-bold text-orange-600">
                {stats?.basic?.avg_urls_per_crawl?.toFixed(1) || 0}
              </p>
            </div>
          </div>

          {/* Top Domains */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <Link2 size={16} className="text-blue-600" />
              Top Domains
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats?.top_domains?.length > 0 ? (
                stats.top_domains.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-sm"
                  >
                    <span className="truncate">{idx + 1}. {d.domain}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {d.crawl_count}× • {d.total_urls || 0} URLs
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Common Errors */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <AlertTriangle size={16} className="text-red-600" />
              Lỗi thường gặp
            </h4>
            {stats?.common_errors?.length > 0 ? (
              <div className="space-y-2">
                {stats.common_errors.map((e, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-3 py-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-sm"
                  >
                    <span>{e.error}</span>
                    <span className="text-xs font-semibold text-red-600">{e.count} lần</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle size={24} className="text-green-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Không có lỗi nào 🎉</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatisticsModal