import api from './api'

export const orderService = {
  getOrders: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/orders?${query}`).then(r => r.data)
  },

  getOrder: (id: string) => api.get(`/orders/${id}`).then(r => r.data),

  /**
   * Creates an order for one checkout attempt.
   *
   * `idempotencyKey` must be stable across retries of the same attempt so the
   * server replays the original order instead of placing another one.
   */
  createOrder: (data: any, idempotencyKey: string) =>
    api.post('/orders', data, { headers: { 'Idempotency-Key': idempotencyKey } }).then(r => r.data),

  updateOrder: (id: string, data: any) => api.put(`/orders/${id}`, data).then(r => r.data),

  cancelRequest: (id: string, reason: string) => api.post(`/orders/${id}/cancel-request`, { reason }).then(r => r.data),

  adminCancel: (id: string, note: string) => api.put(`/orders/${id}`, { status: 'CANCELLED', note }).then(r => r.data),

  refund: (id: string) => api.post(`/orders/${id}/refund`).then(r => r.data),

  invoice: (id: string) => api.get(`/orders/${id}/invoice`, { responseType: 'blob' }).then(r => r.data),

  trackOrder: (orderNumber: string, phone: string) => api.get(`/orders/track/${orderNumber}`, { params: { phone } }).then(r => r.data),
}
