import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, Driver } from '../types'
import { api } from '../lib/api'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      driver: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/driver/login', { email, password })
        const { driver, token } = response.data.data

        set({
          driver,
          token,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          driver: null,
          token: null,
          isAuthenticated: false,
        })
      },

      updateStatus: (status: Driver['status']) => {
        const { driver } = get()
        if (driver) {
          set({ driver: { ...driver, status } })
          // Envoyer au serveur
          api.put('/driver/status', { status }).catch(console.error)
        }
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const response = await api.get('/auth/driver/me')
          set({
            driver: response.data.data.driver,
            isAuthenticated: true,
          })
        } catch {
          set({
            driver: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },
    }),
    {
      name: 'veeocore-driver-auth',
      partialize: (state) => ({
        token: state.token,
        driver: state.driver,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
