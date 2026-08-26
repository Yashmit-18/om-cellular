import api from './api'

export const contactRequestService = {
  getContactRequests: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/contact-requests?${query}`).then(r => r.data)
  },

  createContactRequest: (data: any) => api.post('/contact-requests', data).then(r => r.data),
}
