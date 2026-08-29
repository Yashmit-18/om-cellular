import api from './api'

export type RegisterInput = {
  name: string
  phone: string
  email?: string
  password: string
}

export const authService = {
  register: (data: RegisterInput) =>
    api.post('/auth/register', data).then(r => r.data),

  login: (data: { identifier: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),

  logout: () => api.post('/auth/logout').then(r => r.data),

  getMe: () => api.get('/auth/me').then(r => r.data),

  refresh: () => api.post('/auth/refresh').then(r => r.data),
}