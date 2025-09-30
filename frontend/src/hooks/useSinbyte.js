import { useState } from 'react'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'

export const useSinbyte = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitUrls = async (apikey, urls, name = 'Sitemap Crawler') => {
    if (!apikey) {
      toast.error('Vui lòng nhập Sinbyte API key')
      return
    }

    if (!urls || urls.length === 0) {
      toast.error('Không có URL nào để submit')
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await crawlAPI.submitToSinbyte(apikey, urls, name)
      toast.success(`Đã submit ${urls.length} URLs thành công!`)
      return result
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Lỗi submit'
      toast.error(`Lỗi: ${errorMsg}`)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isSubmitting,
    submitUrls
  }
}