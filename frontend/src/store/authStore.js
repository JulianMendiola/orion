import { create } from 'zustand'
import { supabase } from '@/services/supabase'
import { usePortfolioStore } from '@/store/portfolioStore'

export const useAuthStore = create((set) => ({
  user:    null,
  session: null,
  loading: true,
  demo:    false,

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null, loading: false })

      if (session?.user) {
        usePortfolioStore.getState().syncFromCloud(session.user.id)
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null, demo: false })
        if (session?.user) {
          usePortfolioStore.getState().syncFromCloud(session.user.id)
        }
      })
    } catch {
      // Supabase not configured or network error — allow demo/guest flow
      set({ loading: false })
    }
  },

  enterDemo: () => set({ demo: true }),

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ user: data.user, session: data.session, demo: false })
    await usePortfolioStore.getState().syncFromCloud(data.user.id)
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, demo: false })
  },
}))
