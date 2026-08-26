import api from './api'

export const sellRequestService = {
  getSellRequests: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/sell-requests?${query}`).then(r => r.data)
  },

  getSellRequest: (id: string) => api.get(`/sell-requests/${id}`).then(r => r.data),

  createSellRequest: (data: any) => api.post('/sell-requests', data).then(r => r.data),
}
