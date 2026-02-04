import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, Driver } from '../types'
import { api } from '../lib/api'

// Demo credentials pour test
const DEMO_EMAIL = 'chauffeur@demo.veeocore.fr'
const DEMO_PASSWORD = 'demo2026'

const DEMO_DRIVER: Driver = {
  id: 'drv_demo123',
  tenantId: 'ten_veeo_demo',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'chauffeur@demo.veeocore.fr',
  phone: '+33 6 12 34 56 78',
  status: 'available',
  rating: 4.9,
  totalRides: 156,
  vehicleType: 'berline',
  vehiclePlate: 'AB-123-CD',
  vehicleBrand: 'Mercedes',
  vehicleModel: 'Classe E',
  vehicleColor: 'Noir',
  earningsToday: 145.50,
  earningsMonth: 3250.00
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      driver: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Mode démo
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          set({
            driver: DEMO_DRIVER,
            token: 'demo_token_veeocore_driver',
            isAuthenticated: true,
          })
          return
        }

        // Mode production
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
