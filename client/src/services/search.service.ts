import api from './api'

export interface SearchModelSuggestion {
  type: 'model'
  id: string
  brand: string
  modelName: string
  image?: string
}

export interface SearchProductSuggestion {
  type: 'product'
  id: string
  slug?: string
  name: string
  image?: string
  lowestPrice?: number
  highestPrice?: number
}

export type SearchSuggestion = SearchModelSuggestion | SearchProductSuggestion

export const searchService = {
  getBrands: () => api.get('/phone-catalog/brands').then(r => r.data.data ?? r.data ?? []),

  searchModels: (q: string, signal?: AbortSignal) =>
    api.get(`/phone-catalog?search=${encodeURIComponent(q)}`, { signal }).then(r => {
      const data = r.data?.data ?? r.data ?? []
      return Array.isArray(data) ? data : []
    }),

  searchProducts: (query: string, signal?: AbortSignal) =>
    api.get(`/products?query=${encodeURIComponent(query)}&limit=8`, { signal }).then(r => {
      const data = r.data?.data ?? r.data ?? []
      return Array.isArray(data) ? data : []
    }),
}
