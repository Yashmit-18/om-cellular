import api from './api'

export const productService = {
  getProducts: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/products?${query}`).then(r => r.data)
  },

  getProduct: (id: string) => api.get(`/products/${id}`).then(r => r.data),

  getVariants: (productId: string) => api.get(`/products/${productId}/variants`).then(r => r.data),

  createProduct: (data: any) => api.post('/products', data).then(r => r.data),

  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data).then(r => r.data),

  deleteProduct: (id: string) => api.delete(`/products/${id}`).then(r => r.data),

  createVariant: (productId: string, data: any) => api.post(`/products/${productId}/variants`, data).then(r => r.data),

  updateVariant: (productId: string, variantId: string, data: any) =>
    api.put(`/products/${productId}/variants/${variantId}`, data).then(r => r.data),

  deleteVariant: (productId: string, variantId: string) =>
    api.delete(`/products/${productId}/variants/${variantId}`).then(r => r.data),
}
