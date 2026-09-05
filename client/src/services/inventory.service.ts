import api from './api'

export const inventoryService = {
  getInventory: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/inventory?${query}`).then(r => r.data)
  },

  updateInventory: (items: any[]) => api.put('/inventory', { items }).then(r => r.data),

  getLedger: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/inventory/ledger?${query}`).then(r => r.data)
  },
}