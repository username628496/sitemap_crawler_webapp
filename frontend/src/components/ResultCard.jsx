import { useState, useMemo, useRef, useEffect } from 'react'
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
  Loader2,
  MoreHorizontal,
  KeyRound,
} from 'lucide-react'
import { useSinbyte } from '../hooks/useSinbyte'
import { use1hping } from '../hooks/use1hping'
import { useInstantIndexer } from '../hooks/useInstantIndexer'
import { useLinksIndexer } from '../hooks/useLinksIndexer'
import { useSpeedyIndex } from '../hooks/useSpeedyIndex'
import { useSettingsStore } from '../stores/settingsStore'
import toast from 'react-hot-toast'
import SitemapSection from './SitemapSection'

const ResultCard = ({ site }) => {
  const [expanded, setExpanded] = useState(false)
  const [expandedSitemaps, setExpandedSitemaps] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { isSubmitting: sinbyteSubmitting, submitUrls: sinbyteSubmitUrls } = useSinbyte()
  const { isSubmitting: onehpingSubmitting, submitUrls: onehpingSubmitUrls } = use1hping()
  const { isSubmitting: instantSubmitting, submitUrls: instantSubmitUrls } = useInstantIndexer()
  const { isSubmitting: linksSubmitting, submitUrls: linksSubmitUrls } = useLinksIndexer()
  const { isSubmitting: speedySubmitting, submitUrls: speedySubmitUrls } = useSpeedyIndex()
  const {
    sinbyteApiKey,
    onehpingApiKey,
    instantIndexerApiKey,
    linksIndexerApiKey,
    speedyIndexApiKey,
  } = useSettingsStore()
  const isSubmitting = sinbyteSubmitting || onehpingSubmitting || instantSubmitting || linksSubmitting || speedySubmitting

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Gom toàn bộ URL (unique)
  const allUrls = useMemo(() => {
    if (!site || site.status !== 'success' || !Array.isArray(site.sitemaps)) return []
    const set = new Set()
    site.sitemaps.forEach(sm => (sm?.urls || []).forEach(u => set.add(u)))
    return Array.from(set)
  }, [site])

  if (!site) return null

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

  const handleSinbyteSubmit = async () => {
    if (!sinbyteApiKey) {
      toast.error('Chưa có API key Sinbyte', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await sinbyteSubmitUrls(sinbyteApiKey, allUrls, `Crawl ${site.domain}`)
    } catch {
      // error toast handled inside hook
    }
  }

  const handle1hpingSubmit = async () => {
    if (!onehpingApiKey) {
      toast.error('Chưa có API key 1hping', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await onehpingSubmitUrls(onehpingApiKey, allUrls, `Crawl ${site.domain}`)
    } catch {
      // error toast handled inside hook
    }
  }

  const handleInstantIndexerSubmit = async () => {
    if (!instantIndexerApiKey) {
      toast.error('Chưa có API key InstantIndexer', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await instantSubmitUrls(instantIndexerApiKey, allUrls, `Crawl ${site.domain}`)
    } catch {
      // error toast handled inside hook
    }
  }

  const handleLinksIndexerSubmit = async () => {
    if (!linksIndexerApiKey) {
      toast.error('Chưa có API key LinksIndexer', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await linksSubmitUrls(linksIndexerApiKey, allUrls, `Crawl ${site.domain}`)
    } catch {
      // error toast handled inside hook
    }
  }

  const handleSpeedyIndexSubmit = async () => {
    if (!speedyIndexApiKey) {
      toast.error('Chưa có API key SpeedyIndex', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    if (!urlsCount) {
      toast.error('Không có URL', { icon: <XCircle className="text-red-600" size={18} /> })
      return
    }
    try {
      await speedySubmitUrls(speedyIndexApiKey, allUrls)
    } catch {
      // error toast handled inside hook
    }
  }

  const submitProviders = [
    { key: 'sinbyte', label: 'Sinbyte', apiKey: sinbyteApiKey, submitting: sinbyteSubmitting, onSubmit: handleSinbyteSubmit, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'onehping', label: '1hping', apiKey: onehpingApiKey, submitting: onehpingSubmitting, onSubmit: handle1hpingSubmit, color: 'text-orange-600 dark:text-orange-400' },
    { key: 'instant', label: 'InstantIndexer', apiKey: instantIndexerApiKey, submitting: instantSubmitting, onSubmit: handleInstantIndexerSubmit, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'links', label: 'LinksIndexer', apiKey: linksIndexerApiKey, submitting: linksSubmitting, onSubmit: handleLinksIndexerSubmit, color: 'text-teal-600 dark:text-teal-400' },
    { key: 'speedy', label: 'SpeedyIndex', apiKey: speedyIndexApiKey, submitting: speedySubmitting, onSubmit: handleSpeedyIndexSubmit, color: 'text-indigo-600 dark:text-indigo-400' },
  ]

  const runMenuAction = (fn) => {
    setMenuOpen(false)
    fn()
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

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Kebab menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              disabled={!isSuccess || !urlsCount}
              className="inline-flex items-center justify-center h-7 px-2 rounded-md border bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
              aria-label="Hành động"
              aria-expanded={menuOpen}
              title={urlsCount ? 'Hành động' : 'Không có URL'}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-52 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden">
                {/* Copy + Export */}
                <button
                  onClick={() => runMenuAction(handleCopy)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <Copy size={13} className="text-gray-400" />
                  Copy {urlsCountText} URLs
                </button>
                <button
                  onClick={() => runMenuAction(handleExport)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <FileDown size={13} className="text-gray-400" />
                  Export CSV
                </button>

                <div className="border-t border-gray-100 dark:border-gray-800" />
                <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Submit index
                </div>

                {submitProviders.map(p => {
                  const hasKey = !!p.apiKey
                  return (
                    <button
                      key={p.key}
                      onClick={() => runMenuAction(p.onSubmit)}
                      disabled={!hasKey || isSubmitting}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title={hasKey ? `Submit lên ${p.label}` : `Thiếu API key ${p.label}`}
                    >
                      <span className="flex items-center gap-2">
                        {p.submitting
                          ? <Loader2 size={13} className="animate-spin text-gray-400" />
                          : <Send size={13} className={p.color} />}
                        {p.label}
                      </span>
                      {!hasKey && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                          <KeyRound size={11} /> thiếu key
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Toggle details */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center justify-center h-7 px-2 rounded-md border bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            aria-expanded={expanded}
            aria-label="Xem chi tiết"
          >
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
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