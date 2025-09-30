import { useQuery } from '@tanstack/react-query'
import { crawlAPI } from '../services/api'

export const useStatistics = (days = 30) => {
  return useQuery({
    queryKey: ['statistics', days],
    queryFn: () => crawlAPI.getStatistics(days),
    staleTime: 60000,
  })
}