import api from './api'
import { ServiceArea, ServiceabilityRequest } from '../types'

export const serviceabilityService = {
  check: (pincode: string, services?: string[]) =>
    api.post('/serviceability/check', { pincode, services }).then(r => r.data),

  getAreas: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/serviceability/areas?${query}`).then(r => r.data)
  },

  createArea: (data: Partial<ServiceArea>) => api.post('/serviceability/areas', data).then(r => r.data),

  updateArea: (id: string, data: any) => api.put(`/serviceability/areas/${id}`, data).then(r => r.data),

  deleteArea: (id: string) => api.delete(`/serviceability/areas/${id}`).then(r => r.data),

  createRequest: (data: Partial<ServiceabilityRequest>) => api.post('/serviceability/requests', data).then(r => r.data),

  getRequests: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/serviceability/requests?${query}`).then(r => r.data)
  },

  updateRequest: (id: string, data: any) => api.put(`/serviceability/requests/${id}`, data).then(r => r.data),
}