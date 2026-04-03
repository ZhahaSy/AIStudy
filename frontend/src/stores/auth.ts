import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: string
  email: string
  nickname: string
  avatar?: string
}

interface AuthState {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, nickname?: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        set({ token: res.data.accessToken, user: res.data.user })
      },
      register: async (email, password, nickname) => {
        const res = await api.post('/auth/register', { email, password, nickname })
        set({ token: res.data.accessToken, user: res.data.user })
      },
      logout: () => {
        set({ token: null, user: null })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)