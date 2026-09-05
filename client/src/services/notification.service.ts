import api from './api'

export const notificationService = {
  getNotifications: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/notifications?${query}`).then(r => r.data)
  },

  createNotification: (data: any) => api.post('/notifications', data).then(r => r.data),

  markAsRead: (id: string) => api.put(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () => api.put('/notifications/read-all').then(r => r.data),

  deleteNotification: (id: string) => api.delete(`/notifications/${id}`).then(r => r.data),
}
