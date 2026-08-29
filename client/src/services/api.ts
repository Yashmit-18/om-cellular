import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let refreshing: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(r => r.data?.success === true)
      .catch(() => false)
      .finally(() => { refreshing = null })
  }
  return refreshing
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as any
    const status = error.response?.status

    if (status === 401 && original && !original._retried) {
      original._retried = true
      const refreshed = await tryRefresh()
      if (refreshed) {
        return api(original)
      }
    }

    return Promise.reject(error)
  }
)

export default api