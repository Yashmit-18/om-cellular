import api from './api'

export const inventoryService = {
  getInventory: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/inventory?${query}`).then(r => r.data)
  },

  updateInventory: (id: string, data: any) => api.put(`/inventory/${id}`, data).then(r => r.data),
}
