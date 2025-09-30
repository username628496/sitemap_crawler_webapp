import { useState } from 'react'
import { Settings, Info, X, Sparkles, Zap, Globe, Clock, Database, Send, Package, FileText, Star } from 'lucide-react'
import SettingsModal from './SettingsModal'

const Header = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const features = [
    { icon: Globe, title: 'Crawl nhiều domain', desc: 'Xử lý nhiều domain cùng lúc' },
    { icon: Zap, title: 'Hỗ trợ www/non-www', desc: 'Tự động nhận diện cả 2 định dạng' },
    { icon: Clock, title: 'Progress tracking', desc: 'Theo dõi tiến trình real-time' },
    { icon: Database, title: 'Lịch sử chi tiết', desc: 'Lưu trữ và filter dễ dàng' },
    { icon: Send, title: 'Submit Sinbyte', desc: 'Đẩy URLs trực tiếp lên hệ thống' },
    { icon: Package, title: 'Batch submit', desc: 'Submit hàng loạt domains' },
    { icon: FileText, title: 'Export CSV', desc: 'Xuất dữ liệu và thống kê' },
    { icon: Star, title: 'SEO Tools Pro', desc: 'Tích hợp công cụ SEO chuyên nghiệp' }
  ]

  return (
    <>
      <header className="mt-8 mb-6">
        {/* Top Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium">
            <Sparkles size={16} className="text-blue-500" />
            <span>AE SEO1</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Công cụ crawl <span className="text-blue-600">Sitemap</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Thu thập URLs sitemap và nạp lên Sinbyte trong vài giây
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
          >
            <Info size={16} />
            <span>Tính năng</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
          >
            <Settings size={16} />
            <span>Cài đặt</span>
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tính năng nổi bật</h3>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, idx) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-400 transition"
                    >
                      <Icon size={18} className="text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {feature.title}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {feature.desc}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

export default Header