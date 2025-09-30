import { useState, useMemo } from 'react'
import {
  Globe,
  Copy,
  FileDown,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Clock,
  Link2,
} from 'lucide-react'
import { useSinbyte } from '../hooks/useSinbyte'
import { useSettingsStore } from '../stores/settingsStore'
import toast from 'react-hot-toast'
import SitemapSection from './SitemapSection'

const ResultCard = ({ site, onRefreshHistory }) => {
  const [expanded, setExpanded] = useState(false)
  const [expandedSitemaps, setExpandedSitemaps] = useState({})
  const { isSubmitting, submitUrls } = useSinbyte()
  const { sinbyteApiKey } = useSettingsStore()

  if (!site) return null

  // Gom toàn bộ URL (unique)
  const allUrls = useMemo(() => {
    if (site.status !== 'success' || !Array.isArray(site.sitemaps)) return []
    const set = new Set()
    site.sitemaps.forEach(sm => (sm?.urls || []).forEach(u => set.add(u)))
    return Array.from(set)
  }, [site])

  const isSuccess = site.status === 'success'
  const urlsCount = allUrls.length
  const urlsCountText = (urlsCount || 0).toLocaleString()

  // Duration: ưu tiên site.duration_sec / site.duration (giây). Ẩn nếu không có / = 0
  const rawDurationSec = Number(site?.duration_sec ?? site?.duration ?? 0)
  const durationText = rawDurationSec > 0 ? `${Math.round(rawDurationSec)}s` : '—'

  const handleCopy = async () => {
    if (!urlsCount) {
      toast.error('Không có URL nào để copy', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await navigator.clipboard.writeText(allUrls.join('\n'))
      toast.success(`Đã sao chép ${urlsCountText} URLs`, {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
      })
    } catch {
      toast.error('Lỗi khi copy URLs', { icon: <XCircle className="text-red-600" size={18} /> })
    }
  }

  const handleExport = () => {
    if (!urlsCount) {
      toast.error('Không có URL nào để export', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      const csv = 'URL\n' + allUrls.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${site.domain}_urls.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Đã export ${urlsCountText} URLs`, {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
      })
    } catch {
      toast.error('Lỗi export CSV', { icon: <XCircle className="text-red-600" size={18} /> })
    }
  }

  const handleSubmit = async () => {
    if (!sinbyteApiKey) {
      toast.error('Vui lòng cài đặt Sinbyte API key trước', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL nào để submit', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await submitUrls(sinbyteApiKey, allUrls, `Crawl ${site.domain}`)
      onRefreshHistory?.()
      toast.success('Đã submit lên Sinbyte', {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
      })
    } catch {
      toast.error('Submit thất bại', { icon: <XCircle className="text-red-600" size={18} /> })
    }
  }

  const toggleSitemap = (idx) => {
    setExpandedSitemaps(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Row chính */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Domain + link */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 truncate hover:underline"
            title={site.domain}
          >
            <Link2 size={14} />
            <span className="truncate">{site.domain || 'Unknown'}</span>
          </a>
        </div>

        {/* Trạng thái */}
        <div className="flex items-center">
          {isSuccess ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
              <CheckCircle2 size={13} /> Thành công
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              <XCircle size={13} /> Thất bại
            </span>
          )}
        </div>

        {/* Số URL */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-medium text-blue-600 dark:text-blue-400">{urlsCountText}</span>
          <span>URLs</span>
        </div>

        {/* Thời gian */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <Clock size={12} />
          <span>{durationText}</span>
        </div>

        {/* Actions gọn */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            disabled={!isSuccess || !urlsCount}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            title={urlsCount ? `Copy ${urlsCountText} URLs` : 'Không có URL'}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleExport}
            disabled={!isSuccess || !urlsCount}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            title={urlsCount ? `Export ${urlsCountText} URLs` : 'Không có URL'}
          >
            <FileDown size={14} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isSuccess || !urlsCount || !sinbyteApiKey || isSubmitting}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            title={!sinbyteApiKey ? 'Thiếu API key' : 'Submit lên Sinbyte'}
          >
            <Send size={14} />
          </button>

          {/* Toggle details */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            aria-expanded={expanded}
            aria-label="Xem chi tiết"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Hàng phụ (expand) */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            {!isSuccess ? (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertTriangle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <div className="font-medium mb-0.5">Lỗi crawl</div>
                  <div className="whitespace-pre-wrap break-words">{site.error || 'Không xác định'}</div>
                </div>
              </div>
            ) : (
              <>
                {Array.isArray(site.sitemaps) && site.sitemaps.length > 0 ? (
                  <div className="space-y-2">
                    {site.sitemaps.map((sm, idx) => (
                      <SitemapSection
                        key={`${site.domain}-sm-${idx}`}
                        sitemap={sm}
                        index={idx}
                        domain={site.domain}
                        isExpanded={!!expandedSitemaps[idx]}
                        onToggle={() => toggleSitemap(idx)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Globe className="text-gray-400 mx-auto mb-2" size={22} />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Không có sitemap nào</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultCard