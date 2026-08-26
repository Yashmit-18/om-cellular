import api from './api'

export const reviewService = {
  getReviews: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/reviews?${query}`).then(r => r.data)
  },

  createReview: (data: any) => api.post('/reviews', data).then(r => r.data),
}
