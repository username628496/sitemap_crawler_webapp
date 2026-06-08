import { useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import SettingsModal from './SettingsModal'

const Header = () => {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <header className="mt-8 mb-6">
        {/* Top Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium">
            <Sparkles size={16} className="text-blue-500" />
            <span>IndexHub</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Công cụ crawl <span className="text-blue-600">Sitemap</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Thu thập URLs sitemap và đẩy lên nhiều dịch vụ index trong vài giây
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
          >
            <Settings size={16} />
            <span>Cài đặt</span>
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

export default Header
