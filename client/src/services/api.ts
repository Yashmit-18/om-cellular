import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
        if (refreshResponse.data.success) {
          return api(error.config)
        }
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
