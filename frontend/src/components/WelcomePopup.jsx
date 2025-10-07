import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const APP_VERSION = '1.1.0' // 👉 đổi khi bạn deploy version mới

const WelcomePopup = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = `appWelcomeShown_${APP_VERSION}`
    const hasShown = localStorage.getItem(key)
    if (!hasShown) {
      setVisible(true)
      localStorage.setItem(key, 'true')
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm text-center border border-gray-200 dark:border-gray-800">
        <CheckCircle2 className="mx-auto text-green-500 w-10 h-10 mb-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Tool Crawl Sitemap đã được vá lỗi!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Hệ thống ổn định! Anh em cứ mạnh dạn crawl – không còn lỗi nữa. Chúc anh em on top bền vững!
        </p>
        <button
          onClick={() => setVisible(false)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition"
        >
          OK, đã hiểu
        </button>
      </div>
    </div>
  )
}

export default WelcomePopup
