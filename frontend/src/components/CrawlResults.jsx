import { CheckCircle2, Send, Loader2, Coins } from 'lucide-react'
import { useBatchSinbyte } from '../hooks/useBatchSinbyte'
import { useSettingsStore } from '../stores/settingsStore'
import ResultCard from './ResultCard'
import toast from 'react-hot-toast'

const CrawlResults = ({ results, onRefreshHistory }) => {
  const { isSubmitting, progress, submitBatch } = useBatchSinbyte()
  const { sinbyteApiKey } = useSettingsStore()

  if (!results || results.length === 0) return null

  const handleBatchSubmit = async () => {
    if (!sinbyteApiKey) {
      toast.error('Vui lòng cài đặt Sinbyte API key trước', { duration: 3000 })
      return
    }
    const result = await submitBatch(sinbyteApiKey, results)
    if (result?.success && onRefreshHistory) {
      setTimeout(() => onRefreshHistory(), 1000)
    }
  }

  const successfulCrawls = results.filter(r => r?.status === 'success')

  const totalUrls = successfulCrawls.reduce((sum, r) => {
    if (!Array.isArray(r?.sitemaps)) return sum
    return sum + r.sitemaps.reduce((s, sm) => s + (sm?.urls?.length || 0), 0)
  }, 0)

  // 2 credit cho 1 URL
  const estimatedCredits = totalUrls * 2

  return (
    <section id="crawl-results" className="space-y-3 scroll-mt-6">
      {/* Header compact */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
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

          {/* Right: credits + submit */}
          <div className="flex items-center gap-2">
            {/* Estimated credits */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800
                         bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs font-medium"
              title="Ước tính credit cần thiết (2 credit/URL)"
            >
              <Coins size={14} />
              {estimatedCredits.toLocaleString()} credits
            </div>

            {/* Submit All */}
            {isSubmitting ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
                <Loader2 className="animate-spin text-blue-600" size={14} />
                Đang submit {progress?.current ?? 0}/{progress?.total ?? 0}
              </div>
            ) : (
              <button
                onClick={handleBatchSubmit}
                disabled={successfulCrawls.length === 0 || !sinbyteApiKey}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md
                           focus:outline-none focus:ring-1 focus:ring-blue-400/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title={
                  !sinbyteApiKey
                    ? 'Vui lòng cài đặt API key trước'
                    : `Submit tất cả ${successfulCrawls.length} domains`
                }
              >
                <Send size={14} />
                <span className="hidden sm:inline">Submit All</span>
                <span className="sm:hidden">Submit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results List (compact) */}
      <div className="space-y-2">
        {results.map((site, index) => (
          <ResultCard
            key={site?.id ?? `${site?.domain || 'unknown'}-${index}`}
            site={site}
            onRefreshHistory={onRefreshHistory}
          />
        ))}
      </div>
    </section>
  )
}

export default CrawlResults