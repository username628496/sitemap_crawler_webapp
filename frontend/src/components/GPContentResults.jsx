import { useState, useMemo } from 'react'
import { Globe, Search, Copy, Download, ExternalLink, AlertCircle, Info, ChevronDown, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * GP Content Results - Domain-grouped card display
 * Each domain gets ONE card containing all its URLs
 * Matches the Crawl Sitemap ResultCard pattern
 */
const GPContentResults = ({
  results,
  isLoading,
  progress,
  currentDomain,
  domainInfos
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDomains, setExpandedDomains] = useState({})

  // Group results by domain
  const domainGroups = useMemo(() => {
    const groups = {}
    results.forEach(item => {
      // Use domain from backend (user's input domain)
      const domain = item.domain || extractDomain(item.original_url || item.url)
      if (!groups[domain]) {
        groups[domain] = []
      }
      groups[domain].push(item)
    })
    return groups
  }, [results])

  // Filter results based on search
  const filteredDomainGroups = useMemo(() => {
    if (!searchTerm) return domainGroups

    const filtered = {}
    Object.entries(domainGroups).forEach(([domain, items]) => {
      const matchingItems = items.filter(item => {
        const searchableUrl = (item.original_url || item.url || '').toLowerCase()
        const searchableTitle = (item.title || '').toLowerCase()
        const searchableKeywords = (item.keywords || '').toLowerCase()
        const term = searchTerm.toLowerCase()

        return searchableUrl.includes(term) ||
               searchableTitle.includes(term) ||
               searchableKeywords.includes(term) ||
               domain.toLowerCase().includes(term)
      })

      if (matchingItems.length > 0) {
        filtered[domain] = matchingItems
      }
    })
    return filtered
  }, [domainGroups, searchTerm])

  const toggleDomain = (domain) => {
    setExpandedDomains(prev => ({ ...prev, [domain]: !prev[domain] }))
  }

  /**
   * Copy to clipboard in TSV format for Google Sheets
   */
  const copyToGoogleSheets = () => {
    if (results.length === 0) {
      toast.error('Chưa có dữ liệu', {
        icon: <XCircle className="text-red-600" size={18} />
      })
      return
    }

    let text = "URL\tTitle\tKeywords\n"

    results.forEach(item => {
      const url = item.original_url || item.url || ''
      const title = item.title || '(No title)'
      const keywords = item.keywords || '(No keywords)'
      text += `${url}\t${title}\t${keywords}\n`
    })

    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Đã copy vào clipboard', {
          icon: <CheckCircle2 className="text-green-600" size={18} />,
          duration: 3000
        })
      })
      .catch(() => {
        toast.error('Lỗi khi copy', {
          icon: <XCircle className="text-red-600" size={18} />
        })
      })
  }

  /**
   * Download as CSV file
   */
  const downloadCSV = () => {
    if (results.length === 0) {
      toast.error('Chưa có dữ liệu', {
        icon: <XCircle className="text-red-600" size={18} />
      })
      return
    }

    let csv = "URL,Title,Keywords\n"

    results.forEach(item => {
      const url = `"${(item.original_url || item.url || '').replace(/"/g, '""')}"`
      const title = `"${(item.title || '(No title)').replace(/"/g, '""')}"`
      const keywords = `"${(item.keywords || '(No keywords)').replace(/"/g, '""')}"`
      csv += `${url},${title},${keywords}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `gp-content-${Date.now()}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Đã tải xuống CSV', {
      icon: <CheckCircle2 className="text-green-600" size={18} />
    })
  }

  if (results.length === 0 && !isLoading) {
    return null
  }

  const totalDomains = Object.keys(domainGroups).length
  const totalUrls = results.length

  return (
    <div className="mt-6 space-y-3">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
          {/* Left: title + summary */}
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">GP Content Results</h2>
              {isLoading ? (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Đang crawl: <span className="font-semibold text-blue-600">{currentDomain}</span>
                </p>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {totalDomains}
                    </span>
                    {' domains'}
                  </span>
                  <span aria-hidden className="text-gray-300">•</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {totalUrls.toLocaleString()} URLs
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyToGoogleSheets}
              disabled={results.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md
                         focus:outline-none focus:ring-1 focus:ring-blue-400/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Copy for Google Sheets"
            >
              <Copy size={14} />
              <span className="hidden sm:inline">Copy</span>
            </button>
            <button
              onClick={downloadCSV}
              disabled={results.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md
                         focus:outline-none focus:ring-1 focus:ring-green-400/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Download CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isLoading && progress.total > 0 && (
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {progress.current}/{progress.total} URLs
              </span>
              <span className="text-xs font-medium text-blue-600">
                {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Redirect Notices - Show all domains with redirects */}
        {domainInfos && domainInfos.filter(info => info.has_redirect).length > 0 && (
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2 text-xs">
              <Info className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={14} />
              <div className="text-blue-800 dark:text-blue-200 flex-1">
                <span className="font-medium">Domain redirects:</span>
                <div className="mt-1 space-y-1">
                  {domainInfos.filter(info => info.has_redirect).map((info, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="font-semibold">{info.original_domain}</span>
                      <span>→</span>
                      <span className="font-semibold">{info.target_domain}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {results.length > 0 && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm domain, URL, Title, Keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {searchTerm && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Tìm thấy {Object.keys(filteredDomainGroups).length} domains, {Object.values(filteredDomainGroups).reduce((sum, items) => sum + items.length, 0)} URLs
              </p>
            )}
          </div>
        )}
      </div>

      {/* Domain Cards */}
      {Object.keys(filteredDomainGroups).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(filteredDomainGroups).map(([domain, items]) => (
            <DomainCard
              key={domain}
              domain={domain}
              items={items}
              isExpanded={!!expandedDomains[domain]}
              onToggle={() => toggleDomain(domain)}
            />
          ))}
        </div>
      ) : (
        searchTerm && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-8 text-center">
            <AlertCircle className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="text-gray-600 dark:text-gray-400">
              Không tìm thấy kết quả cho "{searchTerm}"
            </p>
          </div>
        )
      )}
    </div>
  )
}

/**
 * Individual Domain Card Component
 * Similar to ResultCard.jsx from Crawl Sitemap
 */
const DomainCard = ({ domain, items, isExpanded, onToggle }) => {
  const urlCount = items.length

  const handleCopyDomain = async () => {
    // Copy in TSV format for Google Sheets (URL, Title, Keywords)
    let text = "URL\tTitle\tKeywords\n"
    items.forEach(item => {
      const url = item.original_url || item.url || ''
      const title = item.title || '(No title)'
      const keywords = item.keywords || '(No keywords)'
      text += `${url}\t${title}\t${keywords}\n`
    })

    try {
      await navigator.clipboard.writeText(text)
      toast.success(`Đã copy ${urlCount} URLs`, {
        icon: <CheckCircle2 className="text-green-600" size={18} />,
        duration: 3000
      })
    } catch {
      toast.error('Lỗi khi copy', {
        icon: <XCircle className="text-red-600" size={18} />
      })
    }
  }

  const handleExportDomain = () => {
    let csv = "URL,Title,Keywords\n"
    items.forEach(item => {
      const url = `"${(item.original_url || item.url || '').replace(/"/g, '""')}"`
      const title = `"${(item.title || '(No title)').replace(/"/g, '""')}"`
      const keywords = `"${(item.keywords || '(No keywords)').replace(/"/g, '""')}"`
      csv += `${url},${title},${keywords}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${domain}_gp-content.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Đã export ${urlCount} URLs`, {
      icon: <CheckCircle2 className="text-green-600" size={18} />
    })
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Main Row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Domain + Icon */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate hover:underline"
            title={domain}
          >
            {domain}
          </a>
        </div>

        {/* URL Count */}
        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-medium text-blue-600 dark:text-blue-400">{urlCount.toLocaleString()}</span>
          <span>URLs</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyDomain}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            title={`Copy ${urlCount} URLs`}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleExportDomain}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            title={`Export ${urlCount} URLs`}
          >
            <Download size={14} />
          </button>

          {/* Toggle details */}
          <button
            onClick={onToggle}
            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-xs bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            aria-expanded={isExpanded}
            aria-label="Xem chi tiết"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                {/* URL */}
                <a
                  href={item.actual_url || item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-2 group text-sm"
                  title={item.actual_url && item.actual_url !== item.original_url
                    ? `Original: ${item.original_url}\nActual: ${item.actual_url}`
                    : item.original_url || item.url}
                >
                  <ExternalLink size={14} className="mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition" />
                  <span className="break-all">{item.original_url || item.url}</span>
                </a>

                {/* Title */}
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {item.title || <span className="text-gray-400 italic">(No title)</span>}
                </h4>

                {/* Keywords */}
                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Search size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{item.keywords || <span className="italic">(No keywords)</span>}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Extract domain from URL (keep www. if present)
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname  // Keep www. if present
  } catch {
    return 'unknown'
  }
}

export default GPContentResults
