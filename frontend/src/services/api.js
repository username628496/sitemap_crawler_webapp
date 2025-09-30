import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const crawlAPI = {
  crawlStream: (domains) => {
    return new EventSource(`/api/crawl-stream?domains=${domains.join(',')}`)
  },

  getHistory: async (params) => {
    const response = await api.get('/history', { params })
    return response.data
  },

  getStatistics: async (days = 30) => {
    const response = await api.get('/history/statistics', { params: { days } })
    return response.data
  },

  compareDomain: async (domain, limit = 50) => {
    const response = await api.get(`/history/compare/${domain}`, { params: { limit } })
    return response.data
  },

  exportHistory: async (format = 'csv', days = 30) => {
    const response = await api.get('/history/export', {
      params: { format, days },
      responseType: 'blob'
    })
    return response.data
  },

  exportCSV: async (urls) => {
    const response = await api.post('/export', {
      urls,
      type: 'csv'
    }, {
      responseType: 'blob'
    })
    return response.data
  },

  submitToSinbyte: async (apikey, urls, name = 'Sitemap Crawler', dripfeed = 1) => {
    // Use backend proxy to avoid CORS
    const response = await api.post('/sinbyte/submit', {
      apikey,
      name,
      dripfeed,
      urls
    })
    return response.data
  }
  
}



export default api