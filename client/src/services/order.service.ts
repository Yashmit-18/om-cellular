import api from './api'

export const orderService = {
  getOrders: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/orders?${query}`).then(r => r.data)
  },

  getOrder: (id: string) => api.get(`/orders/${id}`).then(r => r.data),

  createOrder: (data: any) => api.post('/orders', data).then(r => r.data),

  updateOrder: (id: string, data: any) => api.put(`/orders/${id}`, data).then(r => r.data),

  trackOrder: (orderNumber: string) => api.get(`/orders/track/${orderNumber}`).then(r => r.data),
}
