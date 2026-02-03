import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

      login: async (email: string, _password: string) => {
        try {
          // TODO: Appeler l'API de login
          // const response = await api.post('/auth/login', { email, _password });
          
          // Simulation
          const mockUser = {
            id: '1',
            email,
            name: 'Admin',
            role: 'admin'
          };
          const mockTenant = {
            id: '1',
            name: 'Demo Company',
            slug: 'demo',
            plan: 'pro'
          };
          const mockToken = 'mock_jwt_token';

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
