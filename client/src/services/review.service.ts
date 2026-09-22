import api from './api'

export const reviewService = {
  getReviews: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/reviews?${query}`).then(r => r.data)
  },

  createReview: (data: any) => api.post('/reviews', data).then(r => r.data),
  updateReview: (id: string, data: any) => api.put(`/reviews/${id}`, data).then(r => r.data),
  deleteReview: (id: string) => api.delete(`/reviews/${id}`).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/reviews/${id}/status`, { status }).then(r => r.data),
}
