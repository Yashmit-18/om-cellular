import api from './api'

export const exchangeRequestService = {
  getExchangeRequests: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/exchange-requests?${query}`).then(r => r.data)
  },

  getExchangeRequest: (id: string) => api.get(`/exchange-requests/${id}`).then(r => r.data),

  createExchangeRequest: (data: any) => api.post('/exchange-requests', data).then(r => r.data),
}
