import { useEffect } from 'react'
import { CheckCircle2, Send, Loader2, Coins } from 'lucide-react'
import { useBatchSinbyte } from '../hooks/useBatchSinbyte'
import { useBatch1hping } from '../hooks/useBatch1hping'
import { useSettingsStore } from '../stores/settingsStore'
import ResultCard from './ResultCard'
import toast from 'react-hot-toast'

const CrawlResults = ({ results, onRefreshHistory }) => {
  const { isSubmitting: sinbyteSubmitting, progress: sinbyteProgress, submitBatch: sinbyteSubmitBatch } = useBatchSinbyte()
  const { isSubmitting: onehpingSubmitting, progress: onehpingProgress, submitBatch: onehpingSubmitBatch } = useBatch1hping()
  const { sinbyteApiKey, onehpingApiKey } = useSettingsStore()

  // Debug: log when results change
  useEffect(() => {
    console.log('CrawlResults: results updated, length:', results?.length || 0)
  }, [results])

  if (!results || results.length === 0) return null

  const handleSinbyteSubmit = async () => {
    if (!sinbyteApiKey) {
      toast.error('Chưa có API key Sinbyte', { duration: 3000 })
      return
    }
    const result = await sinbyteSubmitBatch(sinbyteApiKey, results)
    if (result?.success && onRefreshHistory) {
      setTimeout(() => onRefreshHistory(), 1000)
    }
  }

  const handle1hpingSubmit = async () => {
    if (!onehpingApiKey) {
      toast.error('Chưa có API key 1hping', { duration: 3000 })
      return
    }
    const result = await onehpingSubmitBatch(onehpingApiKey, results)
    if (result?.success && onRefreshHistory) {
      setTimeout(() => onRefreshHistory(), 1000)
    }
  }

  const successfulCrawls = results.filter(r => r?.status === 'success')
  const totalUrls = successfulCrawls.reduce((sum, r) => sum + (r?.total_urls || 0), 0)
  const estimatedCredits = totalUrls * 3

  const isAnySubmitting = sinbyteSubmitting || onehpingSubmitting

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

          {/* Right: credits + submit buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Estimated credits */}
            <div
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-amber-200 dark:border-amber-800
                         bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium"
              title="Ước tính credit cần thiết"
            >
              <Coins size={14} />
              {estimatedCredits.toLocaleString()} credits
            </div>

            {/* Sinbyte Submit All */}
            {sinbyteSubmitting ? (
              <div className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-xs font-medium">
                <Loader2 className="animate-spin" size={12} />
                <span>Sinbyte {sinbyteProgress?.current ?? 0}/{sinbyteProgress?.total ?? 0}</span>
              </div>
            ) : (
              <button
                onClick={handleSinbyteSubmit}
                disabled={successfulCrawls.length === 0 || !sinbyteApiKey || isAnySubmitting}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border
                           bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800
                           hover:bg-blue-100 dark:hover:bg-blue-900/40
                           focus:outline-none focus:ring-1 focus:ring-blue-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title={!sinbyteApiKey ? 'Vui lòng cài đặt API key Sinbyte' : `Submit lên Sinbyte (${successfulCrawls.length} domains)`}
              >
                <Send size={12} />
                <span>Sinbyte</span>
              </button>
            )}

            {/* 1hping Submit All */}
            {onehpingSubmitting ? (
              <div className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-md text-xs font-medium">
                <Loader2 className="animate-spin" size={12} />
                <span>1hping {onehpingProgress?.current ?? 0}/{onehpingProgress?.total ?? 0}</span>
              </div>
            ) : (
              <button
                onClick={handle1hpingSubmit}
                disabled={successfulCrawls.length === 0 || !onehpingApiKey || isAnySubmitting}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border
                           bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800
                           hover:bg-orange-100 dark:hover:bg-orange-900/40
                           focus:outline-none focus:ring-1 focus:ring-orange-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title={!onehpingApiKey ? 'Vui lòng cài đặt API key 1hping' : `Submit lên 1hping (${successfulCrawls.length} domains)`}
              >
                <Send size={12} />
                <span>1hping</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results List (compact) */}
      <div className="space-y-2">
        {results.map((site, index) => (
          <div
            key={site?.id ?? `${site?.domain || 'unknown'}-${index}`}
            className="animate-in fade-in slide-in-from-top-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ResultCard
              site={site}
              onRefreshHistory={onRefreshHistory}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default CrawlResults