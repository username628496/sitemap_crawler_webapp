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

  submitToSinbyte: async (apikey, urls, name = 'Sitemap Crawler', dripfeed = 1) => {
    // Use backend proxy to avoid CORS
    const response = await api.post('/sinbyte/submit', {
      apikey,
      name,
      dripfeed,
      urls
    })
    return response.data
  },

  submitTo1hping: async (apikey, urls, campaignName = 'Sitemap Crawler', numberOfDay = 1) => {
    const response = await api.post('/1hping/campaign/create', {
      apikey,
      urls,
      campaign_name: campaignName,
      number_of_day: numberOfDay,
    })
    return response.data
  },

  submitToInstantIndexer: async (apikey, urls, project = 'Sitemap Crawler', instant = false) => {
    const response = await api.post('/instantindexer/submit', {
      apikey,
      urls,
      project,
      instant,
    })
    return response.data
  },

  submitToLinksIndexer: async (apikey, urls, campaignName = 'Sitemap Crawler', dripfeed = 0) => {
    const response = await api.post('/linksindexer/submit', {
      apikey,
      urls,
      campaign_name: campaignName,
      dripfeed,
    })
    return response.data
  },

  submitToSpeedyIndex: async (apikey, urls) => {
    const response = await api.post('/speedyindex/submit', {
      apikey,
      urls,
    })
    return response.data
  },

}

export default api
