/**
 * Store d'authentification chauffeur
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'available' | 'busy' | 'offline';
  vehicleType?: string;
  vehiclePlate?: string;
  rating?: number;
  totalRides?: number;
  photoUrl?: string;
}

interface AuthState {
  token: string | null;
  driver: Driver | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (phone: string, pin: string) => Promise<boolean>;
  logout: () => void;
  updateDriver: (updates: Partial<Driver>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuth: () => Promise<boolean>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      driver: null,
      tenantId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone: string, pin: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/driver/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, pin })
          });

          const data = await res.json();

          if (!res.ok) {
            set({ error: data.error || 'Identifiants incorrects', isLoading: false });
            return false;
          }

          set({
            token: data.token,
            driver: data.driver,
            tenantId: data.driver.tenant_id,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          set({ 
            error: 'Erreur de connexion au serveur', 
            isLoading: false 
          });
          return false;
        }
      },

      logout: () => {
        set({
          token: null,
          driver: null,
          tenantId: null,
          isAuthenticated: false,
          error: null
        });
      },

      updateDriver: (updates) => {
        const { driver } = get();
        if (driver) {
          set({ driver: { ...driver, ...updates } });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      checkAuth: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const res = await fetch(`${API_URL}/api/v1/driver/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!res.ok) {
            set({ token: null, driver: null, isAuthenticated: false });
            return false;
          }

          const driver = await res.json();
          set({ driver, isAuthenticated: true });
          return true;
        } catch {
          set({ token: null, driver: null, isAuthenticated: false });
          return false;
        }
      }
    }),
    {
      name: 'driver-auth',
      partialize: (state) => ({
        token: state.token,
        driver: state.driver,
        tenantId: state.tenantId,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
