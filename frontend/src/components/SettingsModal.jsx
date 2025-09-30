import { useState } from 'react'
import { X, Key, Save, CheckCircle2 } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import toast from 'react-hot-toast'

const SettingsModal = ({ onClose }) => {
  const { sinbyteApiKey, setSinbyteApiKey } = useSettingsStore()
  const [apiKey, setApiKey] = useState(sinbyteApiKey)

  const handleSave = () => {
    setSinbyteApiKey(apiKey)
    toast.success('Đã lưu cài đặt thành công', {
      icon: <CheckCircle2 className="text-green-600" size={18} />,
    })
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cài đặt API</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Sinbyte API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="oz30z68snk3cg64vbi84basfb7xxxxxxx"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 
                         focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Nhập API key từ{' '}
              <a
                href="https://sinbyte.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sinbyte
              </a>{' '}
              để submit URLs
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              API key được lưu trữ an toàn trên trình duyệt và chỉ được
              sử dụng để submit URLs lên Sinbyte.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
          >
            <Save size={15} />
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal