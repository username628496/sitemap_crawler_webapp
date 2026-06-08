import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Send, Loader2, ChevronDown, Copy, KeyRound } from 'lucide-react'
import { useBatchSinbyte } from '../hooks/useBatchSinbyte'
import { useBatch1hping } from '../hooks/useBatch1hping'
import { useBatchInstantIndexer } from '../hooks/useBatchInstantIndexer'
import { useBatchLinksIndexer } from '../hooks/useBatchLinksIndexer'
import { useBatchSpeedyIndex } from '../hooks/useBatchSpeedyIndex'
import { useSettingsStore } from '../stores/settingsStore'
import ResultCard from './ResultCard'
import toast from 'react-hot-toast'

const CrawlResults = ({ results }) => {
  const sinbyte = useBatchSinbyte()
  const onehping = useBatch1hping()
  const instant = useBatchInstantIndexer()
  const links = useBatchLinksIndexer()
  const speedy = useBatchSpeedyIndex()
  const {
    sinbyteApiKey,
    onehpingApiKey,
    instantIndexerApiKey,
    linksIndexerApiKey,
    speedyIndexApiKey,
  } = useSettingsStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [speedyTaskIds, setSpeedyTaskIds] = useState([])
  const menuRef = useRef(null)

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!results || results.length === 0) return null

  const successfulCrawls = results.filter(r => r?.status === 'success')
  const totalUrls = successfulCrawls.reduce((sum, r) => sum + (r?.total_urls || 0), 0)

  const providers = [
    { key: 'sinbyte', label: 'Sinbyte', apiKey: sinbyteApiKey, state: sinbyte,
      run: () => sinbyte.submitBatch(sinbyteApiKey, results) },
    { key: 'onehping', label: '1hping', apiKey: onehpingApiKey, state: onehping,
      run: () => onehping.submitBatch(onehpingApiKey, results) },
    { key: 'instant', label: 'InstantIndexer', apiKey: instantIndexerApiKey, state: instant,
      run: () => instant.submitBatch(instantIndexerApiKey, results) },
    { key: 'links', label: 'LinksIndexer', apiKey: linksIndexerApiKey, state: links,
      run: () => links.submitBatch(linksIndexerApiKey, results) },
    { key: 'speedy', label: 'SpeedyIndex', apiKey: speedyIndexApiKey, state: speedy,
      run: async () => {
        const r = await speedy.submitBatch(speedyIndexApiKey, results)
        if (r?.taskIds) setSpeedyTaskIds(r.taskIds)
      } },
  ]

  const activeProvider = providers.find(p => p.state.isSubmitting)
  const isAnySubmitting = !!activeProvider

  const handleSubmit = (p) => {
    setMenuOpen(false)
    if (!p.apiKey) {
      toast.error(`Chưa có API key ${p.label}`, { duration: 3000 })
      return
    }
    if (successfulCrawls.length === 0) {
      toast.error('Không có domain thành công', { duration: 3000 })
      return
    }
    if (p.key === 'speedy') setSpeedyTaskIds([])
    p.run()
  }

  const handleCopyTaskIds = async () => {
    try {
      await navigator.clipboard.writeText(speedyTaskIds.join('\n'))
      toast.success('Đã copy task IDs', {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
      })
    } catch {
      toast.error('Lỗi khi copy')
    }
  }

  return (
    <section id="crawl-results" className="space-y-3 scroll-mt-6">
      {/* Header compact */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: title + summary */}
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Kết quả Crawl</h2>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {successfulCrawls.length}
                  </span>
                  /{results.length} thành công
                </span>
                <span aria-hidden className="text-gray-300">•</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {totalUrls.toLocaleString()} URLs
                </span>
              </div>
            </div>
          </div>

          {/* Right: submit dropdown */}
          <div className="relative" ref={menuRef}>
            {isAnySubmitting ? (
              <div className="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-xs font-medium">
                <Loader2 className="animate-spin" size={14} />
                <span>
                  {activeProvider.label} {activeProvider.state.progress?.current ?? 0}/{activeProvider.state.progress?.total ?? 0}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setMenuOpen(v => !v)}
                disabled={successfulCrawls.length === 0}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border
                           bg-blue-600 text-white border-blue-600 hover:bg-blue-700
                           focus:outline-none focus:ring-1 focus:ring-blue-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Send size={13} />
                <span>Submit hàng loạt</span>
                <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Dropdown menu */}
            {menuOpen && !isAnySubmitting && (
              <div className="absolute right-0 mt-1 w-56 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-[11px] font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  Chọn nền tảng ({successfulCrawls.length} domains)
                </div>
                {providers.map(p => {
                  const hasKey = !!p.apiKey
                  return (
                    <button
                      key={p.key}
                      onClick={() => handleSubmit(p)}
                      disabled={!hasKey}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title={hasKey ? `Submit lên ${p.label}` : `Thiếu API key ${p.label}`}
                    >
                      <span className="flex items-center gap-2">
                        <Send size={12} className="text-gray-400" />
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
        </div>

        {/* SpeedyIndex task IDs (async — lưu lại để tra trên dashboard) */}
        {speedyTaskIds.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-indigo-50/50 dark:bg-indigo-900/10">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                SpeedyIndex task IDs ({speedyTaskIds.length}) — tra trạng thái trên dashboard
              </span>
              <button
                onClick={handleCopyTaskIds}
                className="inline-flex items-center gap-1 h-6 px-2 rounded border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-[10px] font-medium transition"
              >
                <Copy size={11} /> Copy
              </button>
            </div>
            <div className="font-mono text-[11px] text-gray-600 dark:text-gray-400 break-all space-y-0.5">
              {speedyTaskIds.map((id, idx) => (
                <div key={idx}>{id}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results List (compact) */}
      <div className="space-y-2">
        {results.map((site, index) => (
          <div
            key={site?.id ?? `${site?.domain || 'unknown'}-${index}`}
            className="animate-in fade-in slide-in-from-top-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ResultCard site={site} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default CrawlResults
