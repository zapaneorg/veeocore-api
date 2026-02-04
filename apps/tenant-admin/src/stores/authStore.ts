/**
 * Store d'authentification Tenant Admin
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  plan: 'starter' | 'pro' | 'business' | 'enterprise';
  apiKey?: string;
  logo?: string;
  createdAt?: string;
}

export interface TenantAdmin {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'manager';
  tenantId: string;
}

interface AuthState {
  token: string | null;
  admin: TenantAdmin | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateTenant: (updates: Partial<Tenant>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuth: () => Promise<boolean>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/tenant/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          const data = await res.json();

          if (!res.ok) {
            set({ error: data.error || 'Identifiants incorrects', isLoading: false });
            return false;
          }

          set({
            token: data.token,
            admin: data.admin,
            tenant: data.tenant,
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
          admin: null,
          tenant: null,
          isAuthenticated: false,
          error: null
        });
      },

      updateTenant: (updates) => {
        const { tenant } = get();
        if (tenant) {
          set({ tenant: { ...tenant, ...updates } });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      checkAuth: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const res = await fetch(`${API_URL}/api/v1/tenant/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!res.ok) {
            set({ token: null, admin: null, tenant: null, isAuthenticated: false });
            return false;
          }

          const data = await res.json();
          set({ admin: data.admin, tenant: data.tenant, isAuthenticated: true });
          return true;
        } catch {
          set({ token: null, admin: null, tenant: null, isAuthenticated: false });
          return false;
        }
      }
    }),
    {
      name: 'tenant-admin-auth',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
