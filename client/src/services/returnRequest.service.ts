import api from './api'

export const returnService = {
  createReturn: (data: { orderId: string; reason: string; description?: string; items: { itemId: string; quantity: number }[] }) =>
    api.post('/returns', data).then(r => r.data),

  getReturns: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/returns?${query}`).then(r => r.data)
  },

  getReturn: (id: string) => api.get(`/returns/${id}`).then(r => r.data),

  updateReturn: (id: string, data: any) => api.put(`/returns/${id}`, data).then(r => r.data),
}

export const warrantyService = {
  getWarranties: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/warranties?${query}`).then(r => r.data)
  },

  getWarranty: (id: string) => api.get(`/warranties/${id}`).then(r => r.data),

  getWarrantiesByOrder: (orderId: string) => api.get(`/warranties/order/${orderId}`).then(r => r.data),

  claimWarranty: (id: string, description?: string) => api.post(`/warranties/${id}/claim`, { description }).then(r => r.data),
}