import { useState, useCallback } from 'react'
import { crawlAPI } from '../services/api'
import toast from 'react-hot-toast'

export const useCrawl = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const startCrawl = useCallback((domains, onComplete) => {
    console.log('useCrawl: Starting crawl, onComplete exists?', !!onComplete)
    
    if (!domains || domains.length === 0) {
      toast.error('Vui lòng nhập domain')
      return
    }

    setIsLoading(true)
    setResults([])
    setProgress({ current: 0, total: domains.length })

    const eventSource = crawlAPI.crawlStream(domains)
    const tempResults = []

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('useCrawl: Received data:', data)

        // Handle status messages (starting, fallback, etc.)
        if (data.status === 'starting' || data.status === 'fallback') {
          console.log('useCrawl: Status message:', data.message)
          return
        }

        // Handle domain result
        if (data.domain) {
          tempResults.push(data)
          setResults([...tempResults])
          setProgress(prev => ({ ...prev, current: prev.current + 1 }))

          if (tempResults.length === domains.length) {
            console.log('useCrawl: All done, tempResults:', tempResults)
            eventSource.close()
            setIsLoading(false)

            const successCount = tempResults.filter(r => r.status === 'success').length
            const failedCount = domains.length - successCount

            // Show appropriate toast based on results
            if (successCount === 0) {
              toast.error(`Crawl thất bại: Tất cả ${domains.length} domain đều lỗi`)
            } else if (failedCount === 0) {
              toast.success(`Crawl hoàn tất: Tất cả ${domains.length} domain thành công`)
            } else {
              toast.success(`Crawl hoàn tất: ${successCount}/${domains.length} thành công, ${failedCount} thất bại`)
            }

            console.log('useCrawl: About to call onComplete, exists?', !!onComplete)
            if (onComplete) {
              console.log('useCrawl: Calling onComplete NOW')
              onComplete(tempResults)
            } else {
              console.error('useCrawl: onComplete is undefined!')
            }
          }
        }
      } catch (error) {
        console.error('useCrawl: Error parsing event data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('useCrawl: EventSource error:', error)
      eventSource.close()
      setIsLoading(false)
      toast.error('Lỗi kết nối. Vui lòng thử lại.')
    }
  }, [])

  return {
    isLoading,
    results,
    progress,
    startCrawl
  }
}