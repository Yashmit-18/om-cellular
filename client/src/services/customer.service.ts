import api from './api'

export const customerService = {
  getCustomers: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/customers?${query}`).then(r => r.data)
  },
}
