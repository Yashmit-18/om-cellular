import api from './api'

export const couponService = {
  getCoupons: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/coupons?${query}`).then(r => r.data)
  },

  createCoupon: (data: any) => api.post('/coupons', data).then(r => r.data),

  validateCoupon: (code: string, total: number) =>
    api.get(`/coupons/validate/${encodeURIComponent(code)}`, { params: { total } }).then(r => r.data),
}
