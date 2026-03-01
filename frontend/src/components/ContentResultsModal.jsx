import { X, Copy, Download, Search, CheckCircle2, XCircle, Info } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

/**
 * Modal to display GP Content Crawler results
 * Shows URL + Title + Keywords in a table
 * Features: Copy to Google Sheets (TSV format), Download CSV, Search
 */
const ContentResultsModal = ({
  results,
  isOpen,
  onClose,
  progress,
  currentDomain,
  isLoading,
  domainInfo  // { original_domain, target_domain, has_redirect }
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  // Filter results based on search
  const filteredResults = results.filter(item => {
    const searchableUrl = (item.original_url || item.url || '').toLowerCase()
    const searchableTitle = (item.title || '').toLowerCase()
    const searchableKeywords = (item.keywords || '').toLowerCase()
    const term = searchTerm.toLowerCase()

    return searchableUrl.includes(term) ||
           searchableTitle.includes(term) ||
           searchableKeywords.includes(term)
  })

  /**
   * Copy to clipboard in TSV format for Google Sheets
   */
  const copyToGoogleSheets = () => {
    if (results.length === 0) {
      toast.error('Chưa có dữ liệu để copy')
      return
    }

    // Header row
    let text = "URL\tTitle\tKeywords\n"

    // Data rows (tab-separated)
    // Use original_url (user's domain) for export, not actual_url (redirected domain)
    results.forEach(item => {
      const url = item.original_url || item.url || ''
      const title = item.title || '(No title)'
      const keywords = item.keywords || '(No keywords)'

      text += `${url}\t${title}\t${keywords}\n`
    })

    // Copy to clipboard
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
      toast.error('Chưa có dữ liệu để download')
      return
    }

    // Create CSV content
    let csv = "URL,Title,Keywords\n"

    results.forEach(item => {
      // Escape commas and quotes in CSV
      // Use original_url (user's domain) for export, not actual_url (redirected domain)
      const url = `"${(item.original_url || item.url || '').replace(/"/g, '""')}"`
      const title = `"${(item.title || '(No title)').replace(/"/g, '""')}"`
      const keywords = `"${(item.keywords || '(No keywords)').replace(/"/g, '""')}"`

      csv += `${url},${title},${keywords}\n`
    })

    // Create blob and download
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-2">
              <Search className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">GP Content Crawler</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading ? (
                <>Đang crawl: <span className="font-semibold text-blue-600">{currentDomain}</span></>
              ) : (
                <>Kết quả: <span className="font-semibold text-green-600">{results.length} URLs</span></>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            title="Đóng"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        {isLoading && progress.total > 0 && (
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Tiến độ: {progress.current}/{progress.total} URLs
              </span>
              <span className="text-sm font-medium text-blue-600">
                {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Redirect Notice */}
        {domainInfo?.has_redirect && (
          <div className="px-6 py-3 border-b bg-blue-50">
            <div className="flex items-start gap-2 text-sm">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-blue-800">
                <span className="font-medium">Domain redirect:</span>{' '}
                <span className="font-semibold">{domainInfo.original_domain}</span>
                {' → '}
                <span className="font-semibold">{domainInfo.target_domain}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {results.length > 0 && (
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm URL, Title, Keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-2">
                Tìm thấy {filteredResults.length} kết quả
              </p>
            )}
          </div>
        )}

        {/* Results Table */}
        <div className="flex-1 overflow-auto p-6">
          {results.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Chưa có kết quả</p>
              <p className="text-sm mt-2">Nhấn "Crawl Content (GP)" để bắt đầu</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                      Keywords
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResults.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600">
                        <a
                          href={item.actual_url || item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline break-all"
                          title={item.actual_url && item.actual_url !== item.original_url
                            ? `Original: ${item.original_url}\nActual: ${item.actual_url}`
                            : item.original_url || item.url}
                        >
                          {item.original_url || item.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {item.title || '(No title)'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.keywords || '(No keywords)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {results.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-end flex-wrap gap-3">
              <div className="flex gap-3">
                <button
                  onClick={copyToGoogleSheets}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <Copy size={18} />
                  Copy for Google Sheets
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  <Download size={18} />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContentResultsModal
