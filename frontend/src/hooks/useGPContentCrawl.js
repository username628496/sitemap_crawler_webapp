import { useState, useCallback, createElement } from 'react'
import toast from 'react-hot-toast'
import { Rocket, CheckCircle2, XCircle } from 'lucide-react'

/**
 * Custom hook for GP Content Crawler
 * Manages SSE streaming for URL + Title + Keywords extraction
 */
export const useGPContentCrawl = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([]) // Array of {original_url, actual_url, title, keywords}
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [currentDomain, setCurrentDomain] = useState('')
  const [domainInfos, setDomainInfos] = useState([]) // Array of { original_domain, target_domain, has_redirect }

  const startCrawl = useCallback((domains) => {
    if (!domains || domains.length === 0) {
      toast.error('Vui lòng nhập domain')
      return
    }

    console.log('[GP Content] Starting crawl for', domains.length, 'domains')

    setIsLoading(true)
    setResults([])
    setProgress({ current: 0, total: 0 })
    setCurrentDomain('')
    setDomainInfos([])

    const domainsParam = domains.join(',')
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/gp-content/crawl-stream?domains=${encodeURIComponent(domainsParam)}`
    )

    const tempResults = []

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[GP Content] Received:', data)

        // Handle status messages
        if (data.status === 'starting') {
          console.log('[GP Content] Starting...')
          toast.success(`Bắt đầu crawl ${data.total_domains} domains`, {
            icon: createElement(Rocket, { className: "text-blue-600", size: 18 })
          })
          return
        }

        if (data.status === 'domain_start') {
          setCurrentDomain(data.domain)
          toast.loading(`Đang crawl ${data.domain}... (${data.current}/${data.total})`, {
            id: 'domain-progress'
          })
          return
        }

        if (data.status === 'domain_complete') {
          // Extract domain info from backend response and add to array
          if (data.original_domain && data.target_domain !== undefined) {
            setDomainInfos(prev => [...prev, {
              original_domain: data.original_domain,
              target_domain: data.target_domain,
              has_redirect: data.has_redirect || false
            }])
          }

          toast.success(
            `${data.domain}: ${data.crawled_urls}/${data.total_urls} URLs`,
            {
              id: 'domain-progress',
              icon: createElement(CheckCircle2, { className: "text-green-600", size: 18 })
            }
          )
          return
        }

        if (data.status === 'completed') {
          console.log('[GP Content] All done!')
          eventSource.close()
          setIsLoading(false)
          setCurrentDomain('')
          toast.success(`Crawled ${tempResults.length} URLs`, {
            icon: createElement(CheckCircle2, { className: "text-green-600", size: 18 })
          })
          return
        }

        if (data.status === 'error') {
          console.error('[GP Content] Error:', data.message)
          eventSource.close()
          setIsLoading(false)
          toast.error(`Lỗi: ${data.message}`, {
            icon: createElement(XCircle, { className: "text-red-600", size: 18 })
          })
          return
        }

        // Handle URL result
        if ((data.original_url || data.url) && data.title !== undefined && data.keywords !== undefined) {
          tempResults.push({
            domain: data.domain,  // Domain from backend
            url: data.original_url || data.url,  // Backward compatibility
            original_url: data.original_url,
            actual_url: data.actual_url,
            title: data.title,
            keywords: data.keywords
          })

          setResults([...tempResults])

          // Update progress if available
          if (data.progress) {
            setProgress({
              current: data.progress.completed || tempResults.length,
              total: data.progress.total || 0
            })
          }

          console.log('[GP Content] Added result:', data.url, `(${tempResults.length} total)`)
        }

      } catch (error) {
        console.error('[GP Content] Error parsing event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[GP Content] EventSource error:', error)
      eventSource.close()
      setIsLoading(false)
      setCurrentDomain('')
      toast.error('Lỗi kết nối', {
        icon: createElement(XCircle, { className: "text-red-600", size: 18 })
      })
    }

    // Cleanup function
    return () => {
      eventSource.close()
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setProgress({ current: 0, total: 0 })
    setCurrentDomain('')
    setDomainInfos([])
  }, [])

  return {
    isLoading,
    results,
    progress,
    currentDomain,
    domainInfos,
    startCrawl,
    clearResults
  }
}
