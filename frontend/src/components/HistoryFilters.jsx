import { Filter, X, Search } from 'lucide-react'

const HistoryFilters = ({ filters, onFilterChange }) => {
  const handleClear = () => {
    const clearedFilters = {
      domain: '',
      status: '',
      date_from: '',
      date_to: ''
    }
    onFilterChange(clearedFilters)
  }

  const handleInputChange = (field, value) => {
    onFilterChange({ [field]: value })
  }

  const hasActiveFilters = filters.domain || filters.status || filters.date_from || filters.date_to

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bộ lọc</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
          >
            <X size={14} />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tìm domain
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={filters.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                placeholder="example.com"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 
                           focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Trạng thái
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                         focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            >
              <option value="">Tất cả</option>
              <option value="success">Thành công</option>
              <option value="failed">Thất bại</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Từ ngày
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleInputChange('date_from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                         focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Đến ngày
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleInputChange('date_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                         focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryFilters