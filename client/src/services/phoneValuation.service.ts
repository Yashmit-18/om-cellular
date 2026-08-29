import api from './api'

export const phoneValuationService = {
  getValuations: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/phone-valuations?${query}`).then(r => r.data)
  },

  getValuation: (id: string) => api.get(`/phone-valuations/${id}`).then(r => r.data),

  createValuation: (data: any) => api.post('/phone-valuations', data).then(r => r.data),

  updateValuation: (id: string, data: any) => api.put(`/phone-valuations/${id}`, data).then(r => r.data),

  deleteValuation: (id: string) => api.delete(`/phone-valuations/${id}`).then(r => r.data),

  calculateValuation: (data: any) => api.post('/phone-valuations/calculate', data).then(r => r.data),
}