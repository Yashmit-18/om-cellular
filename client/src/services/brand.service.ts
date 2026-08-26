import api from './api'

export const brandService = {
  getBrands: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/brands?${query}`).then(r => r.data)
  },

  getBrand: (id: string) => api.get(`/brands/${id}`).then(r => r.data),

  createBrand: (data: any) => api.post('/brands', data).then(r => r.data),

  updateBrand: (id: string, data: any) => api.put(`/brands/${id}`, data).then(r => r.data),

  deleteBrand: (id: string) => api.delete(`/brands/${id}`).then(r => r.data),
}
