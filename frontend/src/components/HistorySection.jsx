import { useState, useEffect } from 'react'
import { History, BarChart3, Download } from 'lucide-react'
import { useHistory } from '../hooks/useHistory'
import HistoryFilters from './HistoryFilters'
import HistoryTable from './HistoryTable'
import HistoryPagination from './HistoryPagination'
import StatisticsModal from './StatisticsModal'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'

const HistorySection = ({ refreshTrigger }) => {
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

  useEffect(() => {
    refetch()
  }, [refreshTrigger, refetch])

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
      toast.success('Đã export lịch sử thành công')
    } catch (error) {
      toast.error('Lỗi khi export lịch sử')
    }
  }

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
              {data?.total > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Tổng cộng{' '}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {data.total}
                  </span>{' '}
                  bản ghi
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400/40 transition"
            >
              <BarChart3 size={16} />
              Thống kê
            </button>
        
          </div>
        </div>
      </div>

      {/* Filters */}
      <HistoryFilters filters={filters} onFilterChange={handleFilterChange} />
      
      {/* Table */}
      <HistoryTable 
        data={data?.results || []} 
        isLoading={isLoading}
        offset={filters.offset}
      />

      {/* Pagination */}
      {data && data.total > 0 && (
        <HistoryPagination
          total={data.total}
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