import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { usePortfolioStore } from '@/store/portfolioStore'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' })

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: true,
      demo:    false,

      // Called on app mount — validate persisted token
      init: async () => {
        const { token } = get()
        if (!token) return set({ loading: false })
        try {
          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          set({ user: data.user, loading: false })
          await usePortfolioStore.getState().syncFromCloud(token)
        } catch {
          // Token expired or invalid — clear it
          set({ user: null, token: null, loading: false })
        }
      },

      enterDemo: () => set({ demo: true }),

      signIn: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        set({ user: data.user, token: data.token, demo: false })
        await usePortfolioStore.getState().syncFromCloud(data.token)
      },

      signUp: async (email, password) => {
        const { data } = await api.post('/auth/register', { email, password })
        // Auto sign-in after registration
        set({ user: data.user, token: data.token, demo: false })
        return data
      },

      signOut: async () => {
        set({ user: null, token: null, demo: false })
      },
    }),
    {
      name: 'orion-auth-v1',
      // Only persist the token, not user/loading/demo (derived on init)
      partialize: (s) => ({ token: s.token }),
    }
  )
)
