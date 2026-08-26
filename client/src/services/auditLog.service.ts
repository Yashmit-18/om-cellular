import api from './api'

export const auditLogService = {
  getAuditLogs: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/audit-logs?${query}`).then(r => r.data)
  },

  createAuditLog: (data: any) => api.post('/audit-logs', data).then(r => r.data),
}
