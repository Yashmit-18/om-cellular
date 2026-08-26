import api from './api'

export const analyticsService = {
  getDashboard: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/analytics/dashboard?${query}`).then(r => r.data)
  },
}
