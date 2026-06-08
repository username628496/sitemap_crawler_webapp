import { useState } from 'react'
import { X, Key, Save, CheckCircle2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import toast from 'react-hot-toast'

const SettingsModal = ({ onClose }) => {
  const {
    sinbyteApiKey, setSinbyteApiKey,
    onehpingApiKey, setOnehpingApiKey,
    instantIndexerApiKey, setInstantIndexerApiKey,
    linksIndexerApiKey, setLinksIndexerApiKey,
    speedyIndexApiKey, setSpeedyIndexApiKey,
  } = useSettingsStore()

  const [draft, setDraft] = useState({
    sinbyte: sinbyteApiKey,
    onehping: onehpingApiKey,
    instant: instantIndexerApiKey,
    links: linksIndexerApiKey,
    speedy: speedyIndexApiKey,
  })
  const [showKeys, setShowKeys] = useState(false)

  const fields = [
    { key: 'sinbyte', name: 'Sinbyte', href: 'https://sinbyte.com/', ring: 'focus:ring-blue-400/40' },
    { key: 'onehping', name: '1hping', href: 'https://app.1hping.com', ring: 'focus:ring-orange-400/40' },
    { key: 'instant', name: 'InstantIndexer', href: 'https://instantindexer.org', ring: 'focus:ring-purple-400/40' },
    { key: 'links', name: 'LinksIndexer', href: 'https://linksindexer.com', ring: 'focus:ring-teal-400/40' },
    { key: 'speedy', name: 'SpeedyIndex', href: 'https://speedyindex.com', ring: 'focus:ring-indigo-400/40' },
  ]

  const handleSave = () => {
    setSinbyteApiKey(draft.sinbyte.trim())
    setOnehpingApiKey(draft.onehping.trim())
    setInstantIndexerApiKey(draft.instant.trim())
    setLinksIndexerApiKey(draft.links.trim())
    setSpeedyIndexApiKey(draft.speedy.trim())
    toast.success('Đã lưu', {
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cài đặt API</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeys(v => !v)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
              title={showKeys ? 'Ẩn API key' : 'Hiện API key'}
            >
              {showKeys ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400/40 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {fields.map(f => {
              const hasKey = !!draft[f.key].trim()
              return (
                <div key={f.key} className="flex items-center gap-2.5">
                  {/* Status dot */}
                  <span
                    className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      hasKey ? 'bg-green-500' : 'border border-gray-300 dark:border-gray-600'
                    }`}
                    title={hasKey ? 'Đã có key' : 'Chưa có key'}
                  />
                  {/* Provider name */}
                  <span className="flex-shrink-0 w-28 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {f.name}
                  </span>
                  {/* Key input */}
                  <input
                    type={showKeys ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={draft[f.key]}
                    onChange={(e) => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder="Nhập API key"
                    className={`flex-1 min-w-0 border border-gray-300 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 ${f.ring} transition`}
                  />
                  {/* Get key link */}
                  <a
                    href={f.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition"
                    title={`Lấy API key từ ${f.name}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              API key được lưu trữ an toàn trên trình duyệt và chỉ được sử dụng để submit URLs.
            </p>
          </div>
        </div>

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
