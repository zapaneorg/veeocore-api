import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant } from '../types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          const response = await api.post('/api/v1/auth/tenant/login', {
            email,
            password,
          });
          
          const { user, tenant, token } = response.data.data;
          
          set({
            user,
            tenant,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error: any) {
          set({ isLoading: false });
          throw new Error(error.response?.data?.message || 'Erreur de connexion');
        }
      },

      logout: () => {
        set({
          user: null,
          tenant: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        delete api.defaults.headers.common['Authorization'];
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/api/v1/auth/tenant/me');
          
          const { user, tenant } = response.data.data;
          
          set({
            user,
            tenant,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            tenant: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          delete api.defaults.headers.common['Authorization'];
        }
      },
    }),
    {
      name: 'veeo-tenant-auth',
      partialize: (state) => ({
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.checkAuth();
        }
      },
    }
  )
);
