import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000')

/**
 * Custom hook for fetching GP Content crawl history
 */
export const useGPContentHistory = (filters = {}) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (filters.limit) params.append('limit', filters.limit)
      if (filters.offset !== undefined) params.append('offset', filters.offset)
      if (filters.domain) params.append('domain', filters.domain)
      if (filters.status) params.append('status', filters.status)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.include_urls) params.append('include_urls', 'true')

      const response = await fetch(`${API_URL}/api/gp-content/history?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching GP Content history:', err)
      setError(err.message)
      setData({ results: [], total: 0, limit: filters.limit || 20, offset: filters.offset || 0 })
    } finally {
      setIsLoading(false)
    }
  }, [
    filters.limit,
    filters.offset,
    filters.domain,
    filters.status,
    filters.date_from,
    filters.date_to,
    filters.include_urls
  ])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const refetch = useCallback(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    data,
    isLoading,
    error,
    refetch
  }
}

/**
 * Fetch session details with URLs
 */
export const fetchSessionDetails = async (sessionId) => {
  try {
    const response = await fetch(`${API_URL}/api/gp-content/history/${sessionId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    console.error('Error fetching session details:', err)
    throw err
  }
}
