import { useState, createElement } from 'react'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle } from 'lucide-react'

// SpeedyIndex giới hạn URL/task → chia chunk để tránh lỗi 413
const CHUNK_SIZE = 1000

export const useBatchSpeedyIndex = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [taskIds, setTaskIds] = useState([])

  const submitBatch = async (apikey, crawlResults) => {
    if (!apikey) {
      toast.error('Chưa có API key SpeedyIndex', {
        icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
      })
      return { success: false, error: 'Missing API key' }
    }

    if (!crawlResults || crawlResults.length === 0) {
      toast.error('Không có kết quả', {
        icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
      })
      return { success: false, error: 'No results' }
    }

    const successfulCrawls = crawlResults.filter(r => r.status === 'success' && r.sitemaps && r.sitemaps.length > 0)

    // Gộp toàn bộ URL của mọi domain thành 1 tập unique
    const allUrls = new Set()
    successfulCrawls.forEach(crawl => {
      crawl.sitemaps.forEach(sm => {
        if (sm.urls) sm.urls.forEach(url => allUrls.add(url))
      })
    })
    const urls = Array.from(allUrls)

    if (urls.length === 0) {
      toast.error('Không có URL', {
        icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
      })
      return { success: false, error: 'No URLs' }
    }

    const chunks = []
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      chunks.push(urls.slice(i, i + CHUNK_SIZE))
    }

    setIsSubmitting(true)
    setProgress({ current: 0, total: chunks.length })
    setTaskIds([])

    const ids = []
    let failCount = 0

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await crawlAPI.submitToSpeedyIndex(apikey, chunks[i])

        // Thành công khi trả về task_id (code 0)
        if (res && res.task_id) {
          ids.push(res.task_id)
          toast.success(`[SpeedyIndex] Task ${i + 1}/${chunks.length}: ${chunks[i].length} URLs`, {
            duration: 2000,
            icon: createElement(CheckCircle2, { className: 'text-green-600', size: 18 })
          })
        } else {
          failCount++
          const msg = res?.message || `code ${res?.code ?? '?'}`
          toast.error(`[SpeedyIndex] Chunk ${i + 1}: ${msg}`, {
            duration: 3000,
            icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
          })
        }
      } catch (error) {
        failCount++
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error'
        toast.error(`[SpeedyIndex] Chunk ${i + 1}: ${errorMsg}`, {
          duration: 3000,
          icon: createElement(XCircle, { className: 'text-red-600', size: 18 })
        })
      }

      setProgress({ current: i + 1, total: chunks.length })
      setTaskIds([...ids])

      // Rate limit 120/min → 0.5s an toàn
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setIsSubmitting(false)

    if (ids.length > 0) {
      toast.success(`[SpeedyIndex] Đã tạo ${ids.length} task cho ${urls.length} URLs`, {
        duration: 3000,
        icon: createElement(CheckCircle2, { className: 'text-green-600', size: 18 })
      })
    }

    return {
      success: ids.length > 0,
      taskIds: ids,
      totalUrls: urls.length,
      summary: { taskCount: ids.length, failCount }
    }
  }

  return { isSubmitting, progress, taskIds, submitBatch }
}
