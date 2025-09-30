import { useQuery } from '@tanstack/react-query'
import { crawlAPI } from '../services/api'

export const useHistory = (filters = {}, enabled = true) => {
  return useQuery({
    queryKey: ['history', filters],
    queryFn: () => crawlAPI.getHistory(filters),
    enabled,
    staleTime: 30000,
  })
}

export const useDomainComparison = (domain, enabled = false) => {
  return useQuery({
    queryKey: ['comparison', domain],
    queryFn: () => crawlAPI.compareDomain(domain),
    enabled,
    staleTime: 30000,
  })
}