import { useState } from 'react'
import { Clock, CheckCircle2, XCircle, ExternalLink, ChevronDown, Info } from 'lucide-react'
import { fetchSessionDetails } from '../hooks/useGPContentHistory'
import toast from 'react-hot-toast'

/**
 * GP Content History Table
 * Displays GP Content crawl history with expandable URL details
 */
const GPContentHistoryTable = ({ data, isLoading, offset }) => {
  const [expandedRows, setExpandedRows] = useState({})
  const [loadingDetails, setLoadingDetails] = useState({})
  const [sessionDetails, setSessionDetails] = useState({})

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Đang tải lịch sử...</span>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Chưa có lịch sử crawl GP Content</p>
      </div>
    )
  }

  const toggleRow = async (sessionId) => {
    const isExpanded = expandedRows[sessionId]

    if (!isExpanded) {
      // Load details if not already loaded
      if (!sessionDetails[sessionId]) {
        setLoadingDetails(prev => ({ ...prev, [sessionId]: true }))
        try {
          const details = await fetchSessionDetails(sessionId)
          setSessionDetails(prev => ({ ...prev, [sessionId]: details }))
        } catch (error) {
          toast.error('Lỗi khi tải chi tiết', {
            icon: <XCircle className="text-red-600" size={18} />
          })
        } finally {
          setLoadingDetails(prev => ({ ...prev, [sessionId]: false }))
        }
      }
    }

    setExpandedRows(prev => ({ ...prev, [sessionId]: !isExpanded }))
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                URLs
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Thời gian
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Chi tiết
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((session, index) => (
              <HistoryRow
                key={session.id}
                session={session}
                index={offset + index + 1}
                isExpanded={expandedRows[session.id]}
                isLoadingDetails={loadingDetails[session.id]}
                details={sessionDetails[session.id]}
                onToggle={() => toggleRow(session.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Individual History Row with expandable details
 */
const HistoryRow = ({ session, index, isExpanded, isLoadingDetails, details, onToggle }) => {
  const statusIcons = {
    success: <CheckCircle2 size={14} className="text-green-600" />,
    failed: <XCircle size={14} className="text-red-600" />
  }

  const statusText = {
    success: 'Thành công',
    failed: 'Thất bại'
  }

  const hasRedirect = session.has_redirect || (session.original_domain && session.target_domain && session.original_domain !== session.target_domain)

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
          {index}
        </td>
        <td className="px-3 py-2 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-900 dark:text-white font-medium">
              {session.original_domain || session.domain}
            </span>
            {hasRedirect && (
              <Info size={12} className="text-blue-600 dark:text-blue-400" title={`Redirect: ${session.original_domain} → ${session.target_domain}`} />
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {session.crawled_urls}
          </span>
          <span className="text-gray-500 dark:text-gray-400">/{session.total_urls}</span>
        </td>
        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>{new Date(session.timestamp).toLocaleString('vi-VN')}</span>
          </div>
        </td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800">
            {statusIcons[session.status]}
            {statusText[session.status]}
          </span>
        </td>
        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
          {session.duration_sec?.toFixed(1)}s
        </td>
        <td className="px-3 py-2 text-center">
          <button
            onClick={onToggle}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-600 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700
                       focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            aria-label="Xem chi tiết"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </td>
      </tr>

      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-gray-50 dark:bg-gray-800">
          <td colSpan="7" className="px-3 py-3">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Đang tải chi tiết...</span>
              </div>
            ) : details && details.urls ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {details.urls.length} URLs:
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {details.urls.map((url, idx) => (
                    <div key={idx} className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs">
                      <a
                        href={url.actual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-blue-600 dark:text-blue-400 hover:underline mb-1"
                      >
                        <ExternalLink size={12} className="mt-0.5 flex-shrink-0" />
                        <span className="break-all">{url.original_url}</span>
                      </a>
                      <div className="text-gray-900 dark:text-white font-medium mb-0.5">
                        {url.title || '(No title)'}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {url.keywords || '(No keywords)'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                Không có dữ liệu chi tiết
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default GPContentHistoryTable
