import { useState, useMemo } from 'react'
import {
  Loader2,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
  ChartNoAxesColumn,
} from 'lucide-react'
import { formatDate, formatDuration, truncateDomain } from '../utils/formatters'
import { crawlAPI } from '../services/api'
import CrawlCompareModal from './CrawlCompareModal'

/** Helpers */
const kfmt = (n) => {
  const num = Number(n || 0)
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm'
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return num.toLocaleString()
}
const showDuration = (sec) => {
  const v = Number(sec || 0)
  if (v <= 0) return '—'
  return formatDuration(v)
}
const dateKey = (isoStr) => new Date(isoStr).toISOString().slice(0, 10)

const HistoryTable = ({ data, isLoading, offset }) => {
  const [comparePayload, setComparePayload] = useState(null)
  const [loadingDomain, setLoadingDomain] = useState(null)

  const openCompare = async (domain) => {
    try {
      setLoadingDomain(domain)
      const res = await crawlAPI.compareDomain(domain, 10)
      setComparePayload(res || { domain, crawls: [] })
    } catch (e) {
      console.error('Error fetching compare data', e)
      setComparePayload({ domain, crawls: [], message: 'Không thể tải dữ liệu so sánh' })
    } finally {
      setLoadingDomain(null)
    }
  }
  const closeCompare = () => setComparePayload(null)

  /** Group by day */
  const groups = useMemo(() => {
    if (!Array.isArray(data)) return []
    const map = new Map()
    data.forEach((r) => {
      const key = dateKey(r.timestamp)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return Array.from(map.entries())
  }, [data])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600 mb-2" size={28} />
          <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-2">
            <Globe className="text-gray-400" size={28} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Không tìm thấy kết quả nào</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Thử điều chỉnh bộ lọc</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {groups.map(([day, records]) => (
          <div key={day}>
            {/* Date header */}
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-bold tracking-wide uppercase text-gray-700 dark:text-gray-300">
                {new Date(day).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {records.map((record, idx) => {
                const index = data.indexOf(record)
                const isSuccess = record.status === 'success'
                const orderNum = offset + index + 1
                const displayDomain = truncateDomain(record.domain || '')

                return (
                  <div
                    key={record.id || `${record.domain}-${index}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-all duration-150
                               hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    {/* Order & time */}
                    <div className="flex items-center gap-3 flex-shrink-0 min-w-[85px]">
                      <div className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 
                                      text-gray-600 dark:text-gray-300 text-xs font-semibold">
                        {orderNum}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        <Clock size={11} className="opacity-60" />
                        <span>{formatDate(record.timestamp)}</span>
                      </div>
                    </div>

                    {/* Domain */}
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://${record.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 
                                   hover:text-blue-600 dark:hover:text-blue-400 group transition-colors"
                        title={record.domain}
                      >
                        <Link2 size={13} className="opacity-50 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-200" />
                        <span className="truncate">{displayDomain}</span>
                      </a>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <div className="flex items-center gap-1.5" title={`${record.total_urls?.toLocaleString() || 0} URLs`}>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {kfmt(record.total_urls || 0)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">URLs</span>
                      </div>
                      <div className="h-3 w-px bg-gray-200 dark:bg-gray-700"></div>
                      <div className="font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap min-w-[40px] text-right">
                        {showDuration(record.duration_sec)}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSuccess ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 
                                       text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-200 
                                       dark:border-emerald-800">
                          <CheckCircle2 size={11} />
                          Thành công
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-900/20 
                                       text-rose-700 dark:text-rose-300 flex items-center gap-1.5 border border-rose-200 
                                       dark:border-rose-800">
                          <XCircle size={11} />
                          Thất bại
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => openCompare(record.domain)}
                        disabled={loadingDomain === record.domain}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold
                                   bg-blue-50 hover:bg-blue-100 active:bg-blue-200 
                                   dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:active:bg-blue-900/40
                                   text-blue-700 dark:text-blue-300 
                                   border border-blue-200 dark:border-blue-800
                                   transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingDomain === record.domain ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <ChartNoAxesColumn size={11} />
                        )}
                        So sánh
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {comparePayload && <CrawlCompareModal payload={comparePayload} onClose={closeCompare} />}
    </>
  )
}

export default HistoryTable