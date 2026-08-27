import api from './api'

export const settingsService = {
  getSettings: (group?: string) => {
    const query = group ? `?group=${group}` : ''
    return api.get(`/settings${query}`).then(r => r.data)
  },

  getAllSettings: () => {
    return api.get('/settings/all').then(r => r.data)
  },

  updateSettings: (data: any) => {
    // Support both formats: direct object or {settings: array}
    if (data.settings && Array.isArray(data.settings)) {
      return api.put('/settings', data).then(r => r.data)
    }
    // Convert object to settings array format
    const settingsArray = Object.entries(data).map(([key, value]) => ({ key, value: String(value || '') }))
    return api.put('/settings', { settings: settingsArray }).then(r => r.data)
  },
}
