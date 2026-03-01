import { useState, useEffect } from 'react'
import { History, BarChart3, Download, CheckCircle2, XCircle } from 'lucide-react'
import { useHistory } from '../hooks/useHistory'
import { useGPContentHistory } from '../hooks/useGPContentHistory'
import HistoryFilters from './HistoryFilters'
import HistoryTable from './HistoryTable'
import GPContentHistoryTable from './GPContentHistoryTable'
import HistoryPagination from './HistoryPagination'
import StatisticsModal from './StatisticsModal'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'

const HistorySection = ({ refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState('sitemap') // 'sitemap' or 'gp-content'
  const [filters, setFilters] = useState({
    limit: 20,
    offset: 0,
    domain: '',
    status: '',
    date_from: '',
    date_to: ''
  })
  const [showStats, setShowStats] = useState(false)

  const { data, isLoading, refetch } = useHistory(filters)
  const { data: gpData, isLoading: isGPLoading, refetch: refetchGP } = useGPContentHistory(filters)

  useEffect(() => {
    refetch()
    refetchGP()
  }, [refreshTrigger, refetch, refetchGP])

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      offset: 0
    }))
  }

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      offset: (page - 1) * prev.limit
    }))
  }

  const handleExport = async () => {
    try {
      const blob = await crawlAPI.exportHistory('csv', 30)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crawl_history_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Đã export', {
        icon: <CheckCircle2 className="text-green-600" size={18} />
      })
    } catch (error) {
      toast.error('Lỗi khi export', {
        icon: <XCircle className="text-red-600" size={18} />
      })
    }
  }

  const currentData = activeTab === 'sitemap' ? data : gpData

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <History size={20} className="text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Lịch sử Crawl
              </h2>
              {currentData?.total > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Tổng cộng{' '}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {currentData.total}
                  </span>{' '}
                  bản ghi
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400/40 transition"
              title="Export CSV"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400/40 transition"
              title="Thống kê"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('sitemap')}
              className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'sitemap'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Crawl Sitemap {data?.total > 0 && `(${data.total})`}
            </button>
            <button
              onClick={() => setActiveTab('gp-content')}
              className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === 'gp-content'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              GP Content {gpData?.total > 0 && `(${gpData.total})`}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <HistoryFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Table */}
      {activeTab === 'sitemap' ? (
        <HistoryTable
          data={data?.results || []}
          isLoading={isLoading}
          offset={filters.offset}
        />
      ) : (
        <GPContentHistoryTable
          data={gpData?.results || []}
          isLoading={isGPLoading}
          offset={filters.offset}
        />
      )}

      {/* Pagination */}
      {currentData && currentData.total > 0 && (
        <HistoryPagination
          total={currentData.total}
          limit={filters.limit}
          offset={filters.offset}
          onPageChange={handlePageChange}
        />
      )}

      {/* Statistics Modal */}
      {showStats && <StatisticsModal onClose={() => setShowStats(false)} />}
    </section>
  )
}

export default HistorySection