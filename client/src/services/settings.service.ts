import api from './api'

export const settingsService = {
  getSettings: (group?: string) => {
    const query = group ? `?group=${group}` : ''
    return api.get(`/settings${query}`).then(r => r.data)
  },

  updateSettings: (data: Record<string, string>) =>
    api.put('/settings', data).then(r => r.data),
}
