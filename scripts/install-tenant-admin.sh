#!/bin/bash
# =============================================================================
# VeeoCore - Script d'installation Dashboard Tenant Admin
# Version: 1.0.0
# Usage: curl -fsSL https://api-core.veeo-stras.fr/install/tenant-admin.sh | bash -s -- --tenant-id=XXX --api-key=XXX
# =============================================================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables par défaut
VEEOCORE_API="https://api-core.veeo-stras.fr"
INSTALL_DIR="veeocore-tenant-admin"
TENANT_ID=""
API_KEY=""
TENANT_NAME=""
PORT=3000

# Affichage du logo
print_logo() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   ██╗   ██╗███████╗███████╗ ██████╗  ██████╗ ██████╗ ██████╗  ║"
    echo "║   ██║   ██║██╔════╝██╔════╝██╔═══██╗██╔════╝██╔═══██╗██╔══██╗ ║"
    echo "║   ██║   ██║█████╗  █████╗  ██║   ██║██║     ██║   ██║██████╔╝ ║"
    echo "║   ╚██╗ ██╔╝██╔══╝  ██╔══╝  ██║   ██║██║     ██║   ██║██╔══██╗ ║"
    echo "║    ╚████╔╝ ███████╗███████╗╚██████╔╝╚██████╗╚██████╔╝██║  ██║ ║"
    echo "║     ╚═══╝  ╚══════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ║"
    echo "║                                                               ║"
    echo "║          Dashboard Tenant Admin - Installation                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Fonction de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé. Veuillez l'installer: https://nodejs.org/"
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ requis. Version actuelle: $(node -v)"
    fi
    log_success "Node.js $(node -v)"
    
    # npm
    if ! command -v npm &> /dev/null; then
        log_error "npm n'est pas installé"
    fi
    log_success "npm $(npm -v)"
    
    # Git (optionnel mais recommandé)
    if command -v git &> /dev/null; then
        log_success "Git $(git --version | cut -d' ' -f3)"
    else
        log_warning "Git non installé (optionnel)"
    fi
    
    # curl ou wget
    if command -v curl &> /dev/null; then
        log_success "curl disponible"
    elif command -v wget &> /dev/null; then
        log_success "wget disponible"
    else
        log_error "curl ou wget requis pour télécharger les fichiers"
    fi
}

# Parser les arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tenant-id=*)
                TENANT_ID="${1#*=}"
                shift
                ;;
            --api-key=*)
                API_KEY="${1#*=}"
                shift
                ;;
            --name=*)
                TENANT_NAME="${1#*=}"
                shift
                ;;
            --port=*)
                PORT="${1#*=}"
                shift
                ;;
            --dir=*)
                INSTALL_DIR="${1#*=}"
                shift
                ;;
            --api=*)
                VEEOCORE_API="${1#*=}"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Option inconnue: $1"
                ;;
        esac
    done
}

# Afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options requises:"
    echo "  --tenant-id=ID       Votre identifiant tenant VeeoCore"
    echo "  --api-key=KEY        Votre clé API VeeoCore"
    echo ""
    echo "Options facultatives:"
    echo "  --name=NAME          Nom de votre entreprise (défaut: extrait de l'API)"
    echo "  --port=PORT          Port du serveur (défaut: 3000)"
    echo "  --dir=DIR            Répertoire d'installation (défaut: veeocore-tenant-admin)"
    echo "  --api=URL            URL de l'API VeeoCore (défaut: https://api-core.veeo-stras.fr)"
    echo "  -h, --help           Afficher cette aide"
    echo ""
    echo "Exemple:"
    echo "  curl -fsSL https://api-core.veeo-stras.fr/install/tenant-admin.sh | bash -s -- --tenant-id=abc123 --api-key=key_xxx"
}

# Valider les credentials
validate_credentials() {
    if [ -z "$TENANT_ID" ] || [ -z "$API_KEY" ]; then
        log_error "Les paramètres --tenant-id et --api-key sont obligatoires. Utilisez --help pour plus d'infos."
    fi
    
    log_info "Validation des credentials avec l'API VeeoCore..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: $API_KEY" \
        -H "X-Tenant-ID: $TENANT_ID" \
        "$VEEOCORE_API/api/v1/tenants/me" 2>/dev/null || echo "error\n000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" != "200" ]; then
        log_error "Credentials invalides. Vérifiez votre tenant-id et api-key. (HTTP $HTTP_CODE)"
    fi
    
    if [ -z "$TENANT_NAME" ]; then
        TENANT_NAME=$(echo "$BODY" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -z "$TENANT_NAME" ]; then
            TENANT_NAME="VeeoCore Tenant"
        fi
    fi
    
    log_success "Tenant vérifié: $TENANT_NAME"
}

# Créer la structure du projet
create_project_structure() {
    log_info "Création du projet dans ./$INSTALL_DIR ..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Le dossier $INSTALL_DIR existe déjà"
        read -p "Voulez-vous le supprimer et recommencer? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            log_error "Installation annulée"
        fi
    fi
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    log_success "Dossier créé: $INSTALL_DIR"
}

# Créer package.json
create_package_json() {
    log_info "Création du package.json..."
    
    cat > package.json << EOF
{
  "name": "veeocore-tenant-admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "start": "vite preview --port $PORT"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.8.0",
    "zustand": "^4.4.7",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0",
    "date-fns": "^2.30.0",
    "socket.io-client": "^4.7.2",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
EOF
    
    log_success "package.json créé"
}

# Créer la configuration Vite
create_vite_config() {
    log_info "Création de la configuration Vite..."
    
    cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
EOF
    
    log_success "vite.config.ts créé"
}

# Créer la configuration TypeScript
create_tsconfig() {
    log_info "Création de la configuration TypeScript..."
    
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
    
    cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF
    
    log_success "tsconfig.json créé"
}

# Créer la configuration Tailwind
create_tailwind_config() {
    log_info "Création de la configuration Tailwind..."
    
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
EOF
    
    cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
    
    log_success "tailwind.config.js créé"
}

# Créer les fichiers source
create_source_files() {
    log_info "Création des fichiers source..."
    
    mkdir -p src/{components,pages,stores,lib,hooks}
    
    # index.html
    cat > index.html << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>$TENANT_NAME - Dashboard Admin</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
EOF
    
    # src/main.tsx
    cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
EOF
    
    # src/index.css
    cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
EOF
    
    # src/lib/config.ts - Configuration avec les credentials
    cat > src/lib/config.ts << EOF
// Configuration VeeoCore - Générée automatiquement
export const config = {
  apiUrl: '$VEEOCORE_API',
  tenantId: '$TENANT_ID',
  apiKey: '$API_KEY',
  tenantName: '$TENANT_NAME',
  version: '1.0.0'
};
EOF
    
    # src/lib/api.ts
    cat > src/lib/api.ts << 'EOF'
import axios from 'axios';
import { config } from './config';

export const api = axios.create({
  baseURL: `${config.apiUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    'X-Tenant-ID': config.tenantId
  }
});

// Intercepteur pour les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Endpoints
export const driversApi = {
  getAll: () => api.get('/drivers'),
  getById: (id: string) => api.get(`/drivers/${id}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.put(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/drivers/${id}/status`, { status })
};

export const bookingsApi = {
  getAll: (params?: any) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: any) => api.post('/bookings', data),
  update: (id: string, data: any) => api.put(`/bookings/${id}`, data),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
  assign: (id: string, driverId: string) => api.post(`/bookings/${id}/assign`, { driverId })
};

export const pricingApi = {
  calculate: (data: any) => api.post('/pricing/calculate', data),
  getConfig: () => api.get('/pricing/config'),
  updateConfig: (data: any) => api.put('/pricing/config', data)
};

export const analyticsApi = {
  getDashboard: (period?: string) => api.get('/analytics/dashboard', { params: { period } }),
  getRevenue: (params?: any) => api.get('/analytics/revenue', { params }),
  getDriverStats: () => api.get('/analytics/drivers')
};
EOF
    
    # src/stores/auth.ts
    cat > src/stores/auth.ts << 'EOF'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../lib/config';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,

      login: async (email: string, password: string) => {
        // TODO: Implémenter l'authentification via l'API
        // Pour la démo, on accepte admin/admin
        if (email && password) {
          set({
            isAuthenticated: true,
            user: { email, name: 'Admin', role: 'admin' }
          });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, user: null });
      }
    }),
    { name: `veeocore-${config.tenantId}-auth` }
  )
);
EOF
    
    # src/App.tsx
    cat > src/App.tsx << 'EOF'
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import BookingsPage from './pages/BookingsPage';
import PricingPage from './pages/PricingPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
EOF
    
    # src/components/Layout.tsx
    cat > src/components/Layout.tsx << 'EOF'
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, DollarSign, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { config } from '../lib/config';

const menuItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/drivers', icon: Users, label: 'Chauffeurs' },
  { path: '/bookings', icon: Calendar, label: 'Réservations' },
  { path: '/pricing', icon: DollarSign, label: 'Tarification' },
  { path: '/settings', icon: Settings, label: 'Paramètres' }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary-600">{config.tenantName}</h1>
          <p className="text-sm text-gray-500">Dashboard Admin</p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-medium">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 p-8">
        {children}
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
EOF
    
    # Pages
    create_pages
    
    log_success "Fichiers source créés"
}

# Créer les pages
create_pages() {
    # src/pages/LoginPage.tsx
    cat > src/pages/LoginPage.tsx << 'EOF'
import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { Loader2 } from 'lucide-react';
import { config } from '../lib/config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Email ou mot de passe incorrect');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{config.tenantName}</h1>
          <p className="text-gray-600 mt-2">Administration Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Powered by VeeoCore
        </p>
      </div>
    </div>
  );
}
EOF
    
    # src/pages/DashboardPage.tsx
    cat > src/pages/DashboardPage.tsx << 'EOF'
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';
import { Users, Calendar, DollarSign, TrendingUp, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.getDashboard().then(r => r.data)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalDrivers: 0,
    activeBookings: 0,
    todayRevenue: 0,
    growthRate: 0
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Chauffeurs actifs"
          value={stats.totalDrivers}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Réservations aujourd'hui"
          value={stats.activeBookings}
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="Revenus du jour"
          value={`${stats.todayRevenue}€`}
          icon={DollarSign}
          color="yellow"
        />
        <StatCard
          title="Croissance"
          value={`+${stats.growthRate}%`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
        <p className="text-gray-500">Les données s'afficheront ici une fois connecté à l'API.</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
EOF
    
    # src/pages/DriversPage.tsx
    cat > src/pages/DriversPage.tsx << 'EOF'
import { useQuery } from '@tanstack/react-query';
import { driversApi } from '../lib/api';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function DriversPage() {
  const [search, setSearch] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.getAll().then(r => r.data)
  });

  const drivers = data?.data || [];
  const filteredDrivers = drivers.filter((d: any) =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Chauffeurs</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={20} />
          Ajouter
        </button>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un chauffeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun chauffeur trouvé
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDrivers.map((driver: any) => (
                <tr key={driver.id}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-500">{driver.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">{driver.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      driver.status === 'available' ? 'bg-green-100 text-green-700' :
                      driver.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {driver.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-primary-600 hover:text-primary-700">
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
EOF
    
    # src/pages/BookingsPage.tsx
    cat > src/pages/BookingsPage.tsx << 'EOF'
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../lib/api';
import { Calendar, Loader2 } from 'lucide-react';

export default function BookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getAll().then(r => r.data)
  });

  const bookings = data?.data || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Aucune réservation</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking: any) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 text-sm">{booking.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">{booking.client_name}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>{booking.pickup_address}</div>
                    <div className="text-gray-500">→ {booking.dropoff_address}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{new Date(booking.scheduled_at).toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-4 font-medium">{booking.price}€</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
EOF
    
    # src/pages/PricingPage.tsx
    cat > src/pages/PricingPage.tsx << 'EOF'
import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '../lib/api';
import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';

export default function PricingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => pricingApi.getConfig().then(r => r.data)
  });

  const config = data || {
    base_price: 5,
    per_km_price: 2,
    per_minute_price: 0.5,
    minimum_price: 8
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tarification</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix de base (€)
              </label>
              <input
                type="number"
                defaultValue={config.base_price}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix par km (€)
              </label>
              <input
                type="number"
                step="0.1"
                defaultValue={config.per_km_price}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix par minute (€)
              </label>
              <input
                type="number"
                step="0.1"
                defaultValue={config.per_minute_price}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix minimum (€)
              </label>
              <input
                type="number"
                defaultValue={config.minimum_price}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Save size={20} />
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
EOF
    
    # src/pages/SettingsPage.tsx
    cat > src/pages/SettingsPage.tsx << 'EOF'
import { config } from '../lib/config';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Paramètres</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Configuration VeeoCore</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
              <input
                type="text"
                value={config.tenantId}
                readOnly
                className="w-full px-4 py-2 border rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
              <input
                type="text"
                value={config.apiUrl}
                readOnly
                className="w-full px-4 py-2 border rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Lien App Chauffeur</h2>
          <p className="text-gray-600 mb-4">
            Partagez ce lien avec vos chauffeurs pour qu'ils installent l'application :
          </p>
          <div className="p-4 bg-gray-100 rounded-lg font-mono text-sm break-all">
            {config.apiUrl}/install/driver-app.sh?tenant-id={config.tenantId}
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
}

# Installer les dépendances
install_dependencies() {
    log_info "Installation des dépendances npm..."
    npm install --silent
    log_success "Dépendances installées"
}

# Créer le script de lancement
create_start_script() {
    log_info "Création des scripts de lancement..."
    
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Démarrage du Dashboard VeeoCore..."
npm run dev
EOF
    chmod +x start.sh
    
    cat > README.md << EOF
# VeeoCore Tenant Admin Dashboard

Dashboard d'administration pour **$TENANT_NAME**

## Démarrage rapide

\`\`\`bash
# Mode développement
npm run dev

# Build production
npm run build

# Preview production
npm run preview
\`\`\`

## Configuration

Les credentials VeeoCore sont configurés dans \`src/lib/config.ts\`

## Structure

\`\`\`
src/
├── components/    # Composants réutilisables
├── pages/         # Pages de l'application
├── stores/        # État global (Zustand)
├── lib/           # Configuration et API
└── hooks/         # Hooks personnalisés
\`\`\`

## Lien App Chauffeur

Partagez ce lien avec vos chauffeurs :
\`\`\`
$VEEOCORE_API/install/driver-app.sh?tenant-id=$TENANT_ID
\`\`\`
EOF
    
    log_success "Scripts créés"
}

# Afficher les instructions finales
print_success() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║           ✅ Installation terminée avec succès !              ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📁 Projet installé dans:${NC} $(pwd)"
    echo ""
    echo -e "${YELLOW}🚀 Pour démarrer:${NC}"
    echo "   cd $INSTALL_DIR"
    echo "   npm run dev"
    echo ""
    echo -e "${YELLOW}📱 Lien App Chauffeur (à partager):${NC}"
    echo "   curl -fsSL $VEEOCORE_API/install/driver-app.sh | bash -s -- --tenant-id=$TENANT_ID --api-key=$API_KEY"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC} $VEEOCORE_API/demo/docs-tenant.html"
    echo ""
}

# === MAIN ===
main() {
    print_logo
    
    parse_arguments "$@"
    check_prerequisites
    validate_credentials
    create_project_structure
    create_package_json
    create_vite_config
    create_tsconfig
    create_tailwind_config
    create_source_files
    install_dependencies
    create_start_script
    
    cd ..
    print_success
}

main "$@"
