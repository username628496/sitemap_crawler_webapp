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
        const site = JSON.parse(event.data)
        console.log('useCrawl: Received site data:', site)
        
        tempResults.push(site)
        setResults([...tempResults])
        setProgress(prev => ({ ...prev, current: prev.current + 1 }))

        if (tempResults.length === domains.length) {
          console.log('useCrawl: All done, tempResults:', tempResults)
          eventSource.close()
          setIsLoading(false)
          
          const successCount = tempResults.filter(r => r.status === 'success').length
          toast.success(`Crawl hoàn tất: ${successCount}/${domains.length} thành công`)
          
          console.log('useCrawl: About to call onComplete, exists?', !!onComplete)
          if (onComplete) {
            console.log('useCrawl: Calling onComplete NOW')
            onComplete(tempResults)
          } else {
            console.error('useCrawl: onComplete is undefined!')
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