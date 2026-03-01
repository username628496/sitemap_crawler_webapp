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
  ArrowRight,
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
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await navigator.clipboard.writeText(allUrls.join('\n'))
      toast.success(`Đã copy ${urlsCountText} URLs`, {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
      })
    } catch {
      toast.error('Lỗi khi copy', { icon: <XCircle className="text-red-600" size={18} /> })
    }
  }

  const handleExport = () => {
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
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
      toast.error('Lỗi khi export', { icon: <XCircle className="text-red-600" size={18} /> })
    }
  }

  const handleSubmit = async () => {
    if (!sinbyteApiKey) {
      toast.error('Chưa có API key', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await submitUrls(sinbyteApiKey, allUrls, `Crawl ${site.domain}`)
      onRefreshHistory?.()
      toast.success('Đã submit', {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
      })
    } catch {
      toast.error('Lỗi khi submit', { icon: <XCircle className="text-red-600" size={18} /> })
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
          <div className="flex flex-col min-w-0">
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
            {site.original_domain && site.original_domain !== site.domain && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <ArrowRight size={10} />
                <span className="truncate">từ {site.original_domain}</span>
              </div>
            )}
          </div>
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
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {/* Redirect Warning (if applicable) */}
                {site.redirect_info && site.redirect_info.total_chains > 0 && (
                  <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                          Website có {site.redirect_info.total_chains} redirect chain(s) với tổng {site.redirect_info.total_hops} redirect(s)
                        </div>
                        <div className="text-xs text-yellow-700 dark:text-yellow-400">
                          Max redirects: {site.redirect_info.max_redirects}
                          {site.redirect_info.has_loops && (
                            <span className="ml-2 inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                              <AlertTriangle size={12} />
                              Redirect loop!
                            </span>
                          )}
                        </div>

                        {/* Show first few redirect chains */}
                        {site.redirect_chains && site.redirect_chains.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300">
                              Xem chi tiết redirect chains
                            </summary>
                            <div className="mt-2 space-y-2">
                              {site.redirect_chains.map((chain, idx) => (
                                <div key={idx} className="pl-3 border-l-2 border-yellow-300 dark:border-yellow-700">
                                  <div className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                    Chain {idx + 1}: {chain.total_redirects} redirect(s) ({chain.total_duration.toFixed(0)}ms)
                                  </div>
                                  <div className="space-y-1">
                                    {chain.hops && chain.hops.map((hop, hopIdx) => (
                                      <div key={hopIdx} className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-1">
                                        <ArrowRight size={12} className="mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <span className="font-mono bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">{hop.status_code}</span>
                                          <span className="mx-1">→</span>
                                          <span className="break-all">{hop.url}</span>
                                          {hop.location && (
                                            <div className="ml-4 text-yellow-600 dark:text-yellow-500">
                                              ➜ {hop.location}
                                            </div>
                                          )}
                                          <span className="ml-1 text-gray-500">({hop.duration.toFixed(0)}ms)</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {chain.has_loop && (
                                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                                      <AlertTriangle size={12} />
                                      Loop at hop {chain.loop_at}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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