import api from './api'

export const phoneValuationService = {
  getValuations: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/phone-valuation?${query}`).then(r => r.data)
  },

  createValuation: (data: any) => api.post('/phone-valuation', data).then(r => r.data),

  calculateValuation: (data: any) => api.post('/phone-valuation/calculate', data).then(r => r.data),
}
