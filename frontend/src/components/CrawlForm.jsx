import { useState, useMemo } from 'react'
import { List, Rocket, Loader2, Copy, FileDown, ExternalLink, CheckCircle2, XCircle, Search } from 'lucide-react'
import { useCrawl } from '../hooks/useCrawl'
import toast from 'react-hot-toast'

const CrawlForm = ({
  onCrawlComplete,
  onResultUpdate,
  crawlResults,
  onClearResults,
  onGPContentCrawl,
  isGPContentLoading
}) => {
  const [domains, setDomains] = useState('')
  const { isLoading, progress, startCrawl } = useCrawl()

  const handleCrawl = () => {
    const domainList = domains.trim().split(/\n+/).filter(d => d.trim())
    if (!domainList.length) {
      toast.error('Vui lòng nhập ít nhất 1 domain', {
        icon: <XCircle className="text-red-600" size={18} />
      })
      return
    }
    onClearResults?.()
    // ✅ Pass both callbacks: onComplete and onResultUpdate
    startCrawl(domainList, onCrawlComplete, onResultUpdate)
  }

  const handleGPContentCrawl = () => {
    const domainList = domains.trim().split(/\n+/).filter(d => d.trim())
    if (!domainList.length) {
      toast.error('Vui lòng nhập ít nhất 1 domain', {
        icon: <XCircle className="text-red-600" size={18} />
      })
      return
    }
    // Pass domains to parent
    onGPContentCrawl(domainList)
  }

  const allUrls = useMemo(() => {
    if (!Array.isArray(crawlResults) || crawlResults.length === 0) return []
    const set = new Set()
    crawlResults.forEach(r => {
      if (r?.status === 'success' && Array.isArray(r.sitemaps)) {
        r.sitemaps.forEach(sm => (sm?.urls || []).forEach(u => set.add(u)))
      }
    })
    return Array.from(set)
  }, [crawlResults])

  const handleCopyUrls = async () => {
    if (!allUrls.length) {
      toast.error('Chưa có URLs nào được crawl', {
        icon: <XCircle className="text-red-600" size={18} />
      })
      return
    }
    try {
      await navigator.clipboard.writeText(allUrls.join('\n'))
      toast.success(`Đã copy ${allUrls.length.toLocaleString()} URLs`, {
        icon: <CheckCircle2 className="text-green-600" size={18} />
      })
    } catch {
      toast.error('Lỗi khi copy URLs', {
        icon: <XCircle className="text-red-600" size={18} />
      })
    }
  }

  const handleExportCSV = () => {
    if (!allUrls.length) {
      toast.error('Chưa có URLs nào để export', {
        icon: <XCircle className="text-red-600" size={18} />
      })
      return
    }
    try {
      const csv = 'URL\n' + allUrls.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crawled_urls_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`Đã export ${allUrls.length.toLocaleString()} URLs`, {
        icon: <CheckCircle2 className="text-green-600" size={18} />
      })
    } catch {
      toast.error('Lỗi khi export CSV', {
        icon: <XCircle className="text-red-600" size={18} />
      })
    }
  }

  const crawledUrlsCount = allUrls.length
  const hasResults = crawledUrlsCount > 0
  const pct =
    progress && progress.total
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  const domainCount = domains.trim() ? domains.trim().split(/\n+/).filter(d => d.trim()).length : 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <List size={18} className="text-blue-600 dark:text-blue-400" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nhập Danh Sách Domain</h2>
      </div>

      <textarea
        id="domainInput"
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
        className="w-full min-h-[10rem] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm
                   text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400
                   focus:outline-none focus:ring-1 focus:ring-blue-400/40 resize-y"
        placeholder={`domain1.com\ndomain2.com\ndomain3.com`}
        disabled={isLoading}
      />

      {domainCount > 0 && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {domainCount} domain
          </span>
        </p>
      )}

      {isLoading && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {progress.current}/{progress.total} domain • {pct}%
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button
          onClick={handleCopyUrls}
          disabled={!hasResults}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 dark:border-gray-700
                     text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
          title="Copy URLs"
        >
          <Copy size={16} />
        </button>

        <button
          onClick={handleExportCSV}
          disabled={!hasResults}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 dark:border-gray-700
                     text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
          title="Export CSV"
        >
          <FileDown size={16} />
        </button>

        <a
          href="https://sinbyte.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 dark:border-gray-700
                     text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Open Sinbyte"
        >
          <ExternalLink size={16} />
        </a>

        <button
          onClick={handleGPContentCrawl}
          disabled={isGPContentLoading || !domains.trim()}
          className="ml-auto inline-flex items-center justify-center gap-1.5 h-9 px-4
                     bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600
                     hover:from-purple-600 hover:via-indigo-600 hover:to-indigo-700
                     text-white text-xs font-bold rounded-md shadow-md hover:shadow-lg
                     focus:outline-none focus:ring-2 focus:ring-purple-400/60
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                     transition-all duration-200 transform hover:scale-[1.02]"
          title="Crawl content: URL + Title + Keywords"
        >
          {isGPContentLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {isGPContentLoading ? 'Crawling...' : 'Crawl Content (GP)'}
        </button>

        <button
          onClick={handleCrawl}
          disabled={isLoading || !domains.trim()}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4
                     bg-gradient-to-r from-orange-500 via-orange-600 to-red-500
                     hover:from-orange-600 hover:via-red-600 hover:to-red-600
                     text-white text-xs font-bold rounded-md shadow-md hover:shadow-lg
                     focus:outline-none focus:ring-2 focus:ring-orange-400/60
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                     transition-all duration-200 transform hover:scale-[1.02]"
          title="Crawl sitemap: URLs only"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
          {isLoading ? 'Đang crawl...' : 'Crawl Sitemap'}
        </button>
      </div>
    </div>
  )
}

export default CrawlForm