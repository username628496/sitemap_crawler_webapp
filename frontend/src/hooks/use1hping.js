import { useState, createElement } from 'react'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle } from 'lucide-react'

export const use1hping = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitUrls = async (apikey, urls, name = 'Sitemap Crawler') => {
    if (!apikey) {
      toast.error('Chưa có API key 1hping', {
        icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
      })
      return
    }

    if (!urls || urls.length === 0) {
      toast.error('Không có URL', {
        icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await crawlAPI.submitTo1hping(apikey, urls, name)
      toast.success(`[1hping] Đã submit ${urls.length} URLs`, {
        icon: createElement(CheckCircle2, { className: 'text-green-600', size: 18 })
      })
      return result
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Lỗi submit'
      toast.error(`[1hping] Lỗi: ${errorMsg}`, {
        icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
      })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isSubmitting, submitUrls }
}
