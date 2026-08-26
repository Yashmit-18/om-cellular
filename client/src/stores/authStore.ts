import { create } from 'zustand'
import { authService } from '../services/auth.service'

interface User {
  id: string
  name: string | null
  email: string | null
  phone?: string | null
  role: 'ADMIN' | 'CUSTOMER'
  image?: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const response = await authService.login({ email, password })
    if (response.success) {
      set({ user: response.data.user })
    }
  },

  register: async (data) => {
    await authService.register(data)
  },

  logout: async () => {
    await authService.logout()
    set({ user: null })
  },

  fetchUser: async () => {
    try {
      const response = await authService.getMe()
      if (response.success) {
        set({ user: response.data, loading: false })
      } else {
        set({ user: null, loading: false })
      }
    } catch {
      set({ user: null, loading: false })
    }
  },

  setUser: (user) => set({ user }),
}))
