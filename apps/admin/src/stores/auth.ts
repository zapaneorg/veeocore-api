import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Credentials de démo
const DEMO_EMAIL = 'admin@demo.veeocore.fr';
const DEMO_PASSWORD = 'admin2026';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setTenant: (tenant: Tenant) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Validation des credentials de démo
        if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          return false;
        }

        try {
          // TODO: Appeler l'API de login en production
          // const response = await api.post('/auth/login', { email, password });
          
          const mockUser = {
            id: '1',
            email: DEMO_EMAIL,
            name: 'Admin VeeoCore',
            role: 'admin'
          };
          const mockTenant = {
            id: '1',
            name: 'VeeoCore Demo',
            slug: 'demo',
            plan: 'pro'
          };
          const mockToken = 'demo_jwt_token_' + Date.now();

          set({
            user: mockUser,
            tenant: mockTenant,
            token: mockToken,
            isAuthenticated: true
          });

          return true;
        } catch (error) {
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          tenant: null,
          token: null,
          isAuthenticated: false
        });
      },

      setTenant: (tenant) => {
        set({ tenant });
      }
    }),
    {
      name: 'veeocore-auth'
    }
  )
);
