import { ChevronDown, ChevronRight, AlertTriangle, FileText, Clock, ExternalLink } from 'lucide-react'
import { formatDuration } from '../utils/formatters'

const SitemapSection = ({ sitemap, index, domain, isExpanded, onToggle }) => {
  const urlsCount = sitemap?.urls?.length || 0
  const urlsCountText = urlsCount.toLocaleString()
  const rawDurationSec = Number(sitemap?.duration ?? 0)
  const durationText = rawDurationSec > 0 ? formatDuration(rawDurationSec) : '—'

  // Error (compact)
  if (sitemap?.error) {
    return (
      <div className="border border-red-200 dark:border-red-800 rounded-md bg-white dark:bg-gray-900">
        <div className="px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <a
              href={sitemap.sitemap}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-red-700 dark:text-red-300 hover:underline break-all inline-flex items-center gap-1.5"
              title={sitemap.sitemap}
            >
              {sitemap.sitemap}
              <ExternalLink size={12} />
            </a>
            <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              <span className="font-medium">Lỗi:</span> {sitemap.error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Normal (compact)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
      {/* Header (row gọn) */}
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* Icon + link */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={16} className="text-gray-600 dark:text-gray-300 flex-shrink-0" />
            <a
              href={sitemap.sitemap}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:underline inline-flex items-center gap-1.5"
              title={sitemap.sitemap}
            >
              <span className="truncate">{sitemap.sitemap}</span>
              <ExternalLink size={12} className="text-gray-400" />
            </a>
          </div>

          {/* Chips thống kê (rút gọn) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
              {urlsCountText} URLs
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <Clock size={12} />
              {durationText}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded content (list URL gọn) */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="max-h-60 overflow-y-auto p-3">
            {urlsCount > 0 ? (
              <ul className="space-y-1.5">
                {sitemap.urls.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline hover:bg-blue-50/60 dark:hover:bg-blue-900/30 rounded px-2 py-1 transition-colors"
                    >
                      <ExternalLink size={14} className="mt-0.5 opacity-60" />
                      <span className="break-all">{url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Không có URL nào
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SitemapSection