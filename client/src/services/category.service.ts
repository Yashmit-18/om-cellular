import api from './api'

export const categoryService = {
  getCategories: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/categories?${query}`).then(r => r.data)
  },

  getCategory: (id: string) => api.get(`/categories/${id}`).then(r => r.data),

  createCategory: (data: any) => api.post('/categories', data).then(r => r.data),

  updateCategory: (id: string, data: any) => api.put(`/categories/${id}`, data).then(r => r.data),

  deleteCategory: (id: string) => api.delete(`/categories/${id}`).then(r => r.data),
}
