import api from './api'

export const cmsService = {
  getBanners: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/banners?${query}`).then(r => r.data)
  },

  createBanner: (data: any) => api.post('/banners', data).then(r => r.data),

  getHomepageSections: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/homepage-sections?${query}`).then(r => r.data)
  },

  createHomepageSection: (data: any) => api.post('/homepage-sections', data).then(r => r.data),

  getInformationCards: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/information-cards?${query}`).then(r => r.data)
  },

  createInformationCard: (data: any) => api.post('/information-cards', data).then(r => r.data),

  getTestimonials: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/testimonials?${query}`).then(r => r.data)
  },

  createTestimonial: (data: any) => api.post('/testimonials', data).then(r => r.data),

  getFAQs: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/faqs?${query}`).then(r => r.data)
  },

  createFAQ: (data: any) => api.post('/faqs', data).then(r => r.data),
}
