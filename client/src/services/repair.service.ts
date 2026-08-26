import api from './api'

export const repairService = {
  getRepairs: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/repairs?${query}`).then(r => r.data)
  },

  getRepair: (id: string) => api.get(`/repairs/${id}`).then(r => r.data),

  createRepair: (data: any) => api.post('/repairs', data).then(r => r.data),

  updateRepair: (id: string, data: any) => api.put(`/repairs/${id}`, data).then(r => r.data),

  trackRepair: (bookingNumber: string) => api.get(`/repairs/track/${bookingNumber}`).then(r => r.data),

  getRepairServices: () => api.get('/repairs/services').then(r => r.data),
}
