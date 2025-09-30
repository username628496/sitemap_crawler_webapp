import { X, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { formatDate, formatDuration } from '../utils/formatters'

const CrawlCompareModal = ({ payload, onClose }) => {
  const domain = payload?.domain || '—'
  const crawls = Array.isArray(payload?.crawls) ? [...payload.crawls] : []
  crawls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const trends = payload?.trends || {}

  const Delta = ({ value, suffix = '', invert = false }) => {
    if (value === null || value === undefined) return <span className="text-gray-400">—</span>
    if (value === 0) return <span className="text-gray-500 font-semibold">0{suffix}</span>
    const good = invert ? value <= 0 : value >= 0
    const Icon = good ? ArrowUpRight : ArrowDownRight
    const cls = good
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'
    const bgCls = good
      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
    const sign = value > 0 ? '+' : ''
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold text-xs ${cls} ${bgCls}`}>
        <Icon size={12} />
        {sign}{value}{suffix}
      </span>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-2xl max-w-3xl w-full">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                So sánh Crawl History
              </h3>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                {domain}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {crawls.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                <Clock size={28} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Chưa có dữ liệu so sánh
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {crawls.map((r, idx) => {
                const prev = crawls[idx + 1]
                const urlDelta = prev ? (r.total_urls - prev.total_urls) : null
                const durDelta = prev ? Math.round(r.duration - prev.duration) : null

                return (
                  <div
                    key={`${r.timestamp}-${idx}`}
                    className="relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg 
                             bg-white dark:bg-gray-800/30
                             hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm
                             transition-all"
                  >
                    {/* Badge for first item */}
                    {idx === 0 && (
                      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide rounded">
                        Mới nhất
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* Left - Time & Status */}
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <Clock size={14} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatDate(r.timestamp)}
                          </div>
                          <div className="text-xs mt-0.5">
                            {r.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border
                                           bg-emerald-50 dark:bg-emerald-900/20 
                                           border-emerald-200 dark:border-emerald-800
                                           text-emerald-700 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 size={11} /> Thành công
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border
                                           bg-rose-50 dark:bg-rose-900/20 
                                           border-rose-200 dark:border-rose-800
                                           text-rose-700 dark:text-rose-400 font-semibold">
                                <XCircle size={11} /> Thất bại
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle - Stats */}
                      <div className="flex-1 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">URLs:</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {r.total_urls.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Thời gian:</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {formatDuration(r.duration)}
                          </span>
                        </div>
                      </div>

                      {/* Right - Deltas */}
                      {prev && (
                        <div className="flex gap-2 text-sm flex-shrink-0">
                          <Delta value={urlDelta} suffix=" URLs" />
                          <Delta value={durDelta} suffix="s" invert />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Overall Trends */}
          {trends && Object.keys(trends).length > 0 && (
            <div className="mt-4 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 
                          bg-blue-50 dark:bg-blue-900/20">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" />
                Xu hướng so với lần crawl trước
              </h4>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Thay đổi URLs</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {trends.url_change >= 0 ? '+' : ''}
                    {trends.url_change} ({trends.url_change_percent}%)
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Thay đổi thời gian</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {trends.duration_change >= 0 ? '+' : ''}
                    {trends.duration_change}s ({trends.duration_change_percent}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CrawlCompareModal