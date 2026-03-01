import { useState, createElement } from 'react'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle } from 'lucide-react'

export const useBatchSinbyte = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState([])

  const submitBatch = async (apikey, crawlResults) => {
    if (!apikey) {
      toast.error('Chưa có API key', {
        icon: createElement(XCircle, { className: "text-red-600", size: 18 })
      })
      return { success: false, error: 'Missing API key' }
    }

    if (!crawlResults || crawlResults.length === 0) {
      toast.error('Không có kết quả', {
        icon: createElement(XCircle, { className: "text-red-600", size: 18 })
      })
      return { success: false, error: 'No results' }
    }

    // Filter only successful crawls
    const successfulCrawls = crawlResults.filter(r => r.status === 'success' && r.sitemaps && r.sitemaps.length > 0)

    if (successfulCrawls.length === 0) {
      toast.error('Không có domain thành công', {
        icon: createElement(XCircle, { className: "text-red-600", size: 18 })
      })
      return { success: false, error: 'No successful crawls' }
    }

    setIsSubmitting(true)
    setProgress({ current: 0, total: successfulCrawls.length })
    setResults([])

    const batchResults = []

    // Submit each domain sequentially to avoid overwhelming Sinbyte
    for (let i = 0; i < successfulCrawls.length; i++) {
      const crawl = successfulCrawls[i]
      
      // Collect all URLs from all sitemaps for this domain
      const allUrls = new Set()
      crawl.sitemaps.forEach(sm => {
        if (sm.urls) {
          sm.urls.forEach(url => allUrls.add(url))
        }
      })

      const urlsArray = Array.from(allUrls)

      if (urlsArray.length === 0) {
        batchResults.push({
          domain: crawl.domain,
          status: 'skipped',
          message: 'No URLs found'
        })
        continue
      }

      try {
        const result = await crawlAPI.submitToSinbyte(
          apikey,
          urlsArray,
          `Crawl ${crawl.domain}`,
          1
        )

        batchResults.push({
          domain: crawl.domain,
          status: 'success',
          urlCount: urlsArray.length,
          response: result
        })

        toast.success(`${crawl.domain}: ${urlsArray.length} URLs`, {
          duration: 2000,
          icon: createElement(CheckCircle2, { className: "text-green-600", size: 18 })
        })

      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error'
        
        batchResults.push({
          domain: crawl.domain,
          status: 'failed',
          error: errorMsg
        })

        toast.error(`${crawl.domain}: ${errorMsg}`, {
          duration: 3000,
          icon: createElement(XCircle, { className: "text-red-600", size: 18 })
        })
      }

      setProgress({ current: i + 1, total: successfulCrawls.length })
      setResults([...batchResults])

      // Small delay between requests to be nice to Sinbyte API
      if (i < successfulCrawls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setIsSubmitting(false)

    // Summary toast
    const successCount = batchResults.filter(r => r.status === 'success').length
    const failCount = batchResults.filter(r => r.status === 'failed').length

    if (successCount > 0) {
      toast.success(`${successCount} thành công, ${failCount} thất bại`, {
        duration: 3000,
        icon: createElement(CheckCircle2, { className: "text-green-600", size: 18 })
      })
    }

    return {
      success: true,
      results: batchResults,
      summary: { successCount, failCount, total: batchResults.length }
    }
  }

  return {
    isSubmitting,
    progress,
    results,
    submitBatch
  }
}