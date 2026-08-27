import api from './api'

export const phoneCatalogService = {
  getBrands: () => api.get('/phone-catalog/brands').then(r => r.data),
  
  getModelsByBrand: (brand: string) => api.get(`/phone-catalog/models/${encodeURIComponent(brand)}`).then(r => r.data),

  getAll: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/phone-catalog?${query}`).then(r => r.data)
  },

  getAdminAll: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/phone-catalog/admin/all?${query}`).then(r => r.data)
  },

  create: (data: any) => api.post('/phone-catalog', data).then(r => r.data),

  update: (id: string, data: any) => api.put(`/phone-catalog/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/phone-catalog/${id}`).then(r => r.data),

  seed: (phones: any[]) => api.post('/phone-catalog/seed', { phones }).then(r => r.data),
}
