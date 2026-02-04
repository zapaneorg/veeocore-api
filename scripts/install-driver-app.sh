#!/bin/bash
# =============================================================================
# VeeoCore - Script d'installation App Driver (PWA)
# Version: 1.0.0
# Usage: curl -fsSL https://api-core.veeo-stras.fr/install/driver-app.sh | bash -s -- --tenant-id=XXX --api-key=XXX
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Variables
VEEOCORE_API="https://api-core.veeo-stras.fr"
INSTALL_DIR="veeocore-driver-app"
TENANT_ID=""
API_KEY=""
TENANT_NAME=""
PORT=5175

# Logo
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
    echo "║              App Driver (PWA) - Installation                  ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé. Installez-le: https://nodejs.org/"
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ requis. Version actuelle: $(node -v)"
    fi
    log_success "Node.js $(node -v)"
    
    if ! command -v npm &> /dev/null; then
        log_error "npm n'est pas installé"
    fi
    log_success "npm $(npm -v)"
}

# Parser les arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tenant-id=*) TENANT_ID="${1#*=}"; shift ;;
            --api-key=*) API_KEY="${1#*=}"; shift ;;
            --name=*) TENANT_NAME="${1#*=}"; shift ;;
            --port=*) PORT="${1#*=}"; shift ;;
            --dir=*) INSTALL_DIR="${1#*=}"; shift ;;
            --api=*) VEEOCORE_API="${1#*=}"; shift ;;
            -h|--help) show_help; exit 0 ;;
            *) log_error "Option inconnue: $1" ;;
        esac
    done
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options requises:"
    echo "  --tenant-id=ID       Identifiant tenant VeeoCore"
    echo "  --api-key=KEY        Clé API VeeoCore"
    echo ""
    echo "Options facultatives:"
    echo "  --name=NAME          Nom de l'entreprise"
    echo "  --port=PORT          Port du serveur (défaut: 5175)"
    echo "  --dir=DIR            Répertoire d'installation"
    echo "  --api=URL            URL de l'API VeeoCore"
    echo "  -h, --help           Afficher cette aide"
}

# Valider les credentials
validate_credentials() {
    if [ -z "$TENANT_ID" ] || [ -z "$API_KEY" ]; then
        log_error "Les paramètres --tenant-id et --api-key sont obligatoires"
    fi
    
    log_info "Validation des credentials..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: $API_KEY" \
        -H "X-Tenant-ID: $TENANT_ID" \
        "$VEEOCORE_API/api/v1/tenants/me" 2>/dev/null || echo "error\n000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" != "200" ]; then
        log_error "Credentials invalides (HTTP $HTTP_CODE)"
    fi
    
    if [ -z "$TENANT_NAME" ]; then
        TENANT_NAME=$(echo "$BODY" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
        [ -z "$TENANT_NAME" ] && TENANT_NAME="VeeoCore"
    fi
    
    log_success "Tenant: $TENANT_NAME"
}

# Créer le projet
create_project() {
    log_info "Création du projet..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Le dossier $INSTALL_DIR existe"
        read -p "Supprimer et recommencer? (y/n) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] && rm -rf "$INSTALL_DIR" || log_error "Annulé"
    fi
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    mkdir -p src/{components,pages,stores,lib,hooks} public
    
    log_success "Structure créée"
}

# Créer package.json
create_package_json() {
    log_info "Création package.json..."
    
    cat > package.json << EOF
{
  "name": "veeocore-driver-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port $PORT",
    "build": "tsc && vite build",
    "preview": "vite preview --port $PORT",
    "start": "npm run preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
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
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0"
  }
}
EOF
    log_success "package.json créé"
}

# Configuration Vite avec PWA
create_vite_config() {
    log_info "Configuration Vite + PWA..."
    
    cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'VeeoCore Driver',
        short_name: 'VeeoDriver',
        description: 'Application chauffeur VeeoCore',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api-core\.veeo-stras\.fr\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5175,
    host: true
  }
});
EOF
    log_success "vite.config.ts créé"
}

# TypeScript config
create_tsconfig() {
    log_info "Configuration TypeScript..."
    
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
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
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

# Tailwind config
create_tailwind_config() {
    log_info "Configuration Tailwind..."
    
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
        }
      }
    }
  },
  plugins: []
}
EOF
    
    cat > postcss.config.js << 'EOF'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
EOF
    log_success "tailwind.config.js créé"
}

# Créer les fichiers source
create_source_files() {
    log_info "Création des fichiers source..."
    
    # index.html
    cat > index.html << EOF
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#3b82f6" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <title>$TENANT_NAME - Chauffeur</title>
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
import App from './App';
import './index.css';

// Enregistrer le Service Worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
EOF
    
    # src/index.css
    cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}

/* PWA safe areas */
.safe-top { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
EOF
    
    # src/lib/config.ts
    cat > src/lib/config.ts << EOF
export const config = {
  apiUrl: '$VEEOCORE_API',
  wsUrl: '$VEEOCORE_API'.replace('https', 'wss').replace('http', 'ws'),
  tenantId: '$TENANT_ID',
  apiKey: '$API_KEY',
  tenantName: '$TENANT_NAME'
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

export const driverApi = {
  login: (email: string, password: string) => 
    api.post('/driver/auth/login', { email, password }),
  getProfile: () => api.get('/driver/profile'),
  updateStatus: (status: string) => 
    api.patch('/driver/status', { status }),
  updateLocation: (lat: number, lng: number) => 
    api.post('/driver/location', { latitude: lat, longitude: lng }),
  getAssignedBookings: () => api.get('/driver/bookings'),
  acceptBooking: (id: string) => api.post(`/driver/bookings/${id}/accept`),
  rejectBooking: (id: string) => api.post(`/driver/bookings/${id}/reject`),
  startRide: (id: string) => api.post(`/driver/bookings/${id}/start`),
  completeRide: (id: string) => api.post(`/driver/bookings/${id}/complete`)
};
EOF
    
    # src/lib/socket.ts
    cat > src/lib/socket.ts << 'EOF'
import { io, Socket } from 'socket.io-client';
import { config } from './config';

let socket: Socket | null = null;

export const initSocket = (driverId: string) => {
  if (socket) return socket;
  
  socket = io(config.wsUrl, {
    auth: { driverId, tenantId: config.tenantId },
    transports: ['websocket']
  });

  socket.on('connect', () => console.log('WebSocket connected'));
  socket.on('disconnect', () => console.log('WebSocket disconnected'));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
EOF
    
    # src/stores/auth.ts
    cat > src/stores/auth.ts << 'EOF'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../lib/config';
import { driverApi } from '../lib/api';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  vehicle?: { model: string; plate: string };
}

interface AuthState {
  driver: Driver | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateStatus: (status: string) => void;
}

// Demo credentials
const DEMO_EMAIL = 'chauffeur@demo.veeocore.fr';
const DEMO_PASSWORD = 'demo2026';
const DEMO_DRIVER: Driver = {
  id: 'demo-driver-1',
  name: 'Jean Dupont',
  email: DEMO_EMAIL,
  phone: '+33 6 12 34 56 78',
  status: 'available',
  vehicle: { model: 'Mercedes Classe E', plate: 'AB-123-CD' }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      driver: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Demo mode
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          set({ driver: DEMO_DRIVER, token: 'demo_token', isAuthenticated: true });
          return true;
        }

        try {
          const { data } = await driverApi.login(email, password);
          set({ driver: data.driver, token: data.token, isAuthenticated: true });
          return true;
        } catch {
          return false;
        }
      },

      logout: () => set({ driver: null, token: null, isAuthenticated: false }),

      updateStatus: (status) => {
        const driver = get().driver;
        if (driver) set({ driver: { ...driver, status: status as any } });
      }
    }),
    { name: `veeocore-driver-${config.tenantId}` }
  )
);
EOF
    
    # src/stores/bookings.ts
    cat > src/stores/bookings.ts << 'EOF'
import { create } from 'zustand';

interface Booking {
  id: string;
  client_name: string;
  client_phone: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_at: string;
  price: number;
  status: string;
}

interface BookingsState {
  bookings: Booking[];
  currentBooking: Booking | null;
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  setCurrentBooking: (booking: Booking | null) => void;
  updateBookingStatus: (id: string, status: string) => void;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  bookings: [],
  currentBooking: null,
  
  setBookings: (bookings) => set({ bookings }),
  
  addBooking: (booking) => set((s) => ({ 
    bookings: [...s.bookings, booking] 
  })),
  
  setCurrentBooking: (booking) => set({ currentBooking: booking }),
  
  updateBookingStatus: (id, status) => set((s) => ({
    bookings: s.bookings.map(b => b.id === id ? { ...b, status } : b),
    currentBooking: s.currentBooking?.id === id 
      ? { ...s.currentBooking, status } 
      : s.currentBooking
  }))
}));
EOF
    
    # src/App.tsx
    cat > src/App.tsx << 'EOF'
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BookingsPage from './pages/BookingsPage';
import RidePage from './pages/RidePage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/BottomNav';

export default function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 safe-bottom">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/ride/:id" element={<RidePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
EOF
    
    # Créer les composants et pages
    create_components
    create_pages
    create_pwa_assets
    
    log_success "Fichiers source créés"
}

create_components() {
    # src/components/BottomNav.tsx
    cat > src/components/BottomNav.tsx << 'EOF'
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/bookings', icon: Calendar, label: 'Courses' },
  { path: '/profile', icon: User, label: 'Profil' }
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-bottom">
      <div className="flex justify-around py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <item.icon size={24} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
EOF
    
    # src/components/StatusToggle.tsx
    cat > src/components/StatusToggle.tsx << 'EOF'
import { useAuthStore } from '../stores/auth';

export default function StatusToggle() {
  const { driver, updateStatus } = useAuthStore();
  const isOnline = driver?.status !== 'offline';

  const toggle = () => {
    updateStatus(isOnline ? 'offline' : 'available');
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-3 px-6 py-3 rounded-full font-medium transition-all ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-gray-300 text-gray-700'
      }`}
    >
      <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
      {isOnline ? 'En ligne' : 'Hors ligne'}
    </button>
  );
}
EOF
    
    # src/components/BookingCard.tsx
    cat > src/components/BookingCard.tsx << 'EOF'
import { MapPin, Phone, Clock, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingCardProps {
  booking: {
    id: string;
    client_name: string;
    client_phone: string;
    pickup_address: string;
    dropoff_address: string;
    scheduled_at: string;
    price: number;
    status: string;
  };
  onAccept?: () => void;
  onReject?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
}

export default function BookingCard({ booking, onAccept, onReject, onStart, onComplete }: BookingCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{booking.client_name}</h3>
          <a href={`tel:${booking.client_phone}`} className="flex items-center gap-1 text-primary-600 text-sm">
            <Phone size={14} /> {booking.client_phone}
          </a>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-green-600">
            <Euro size={18} /> {booking.price}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={14} />
            {format(new Date(booking.scheduled_at), 'HH:mm', { locale: fr })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPin size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{booking.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{booking.dropoff_address}</span>
        </div>
      </div>

      {booking.status === 'pending' && onAccept && onReject && (
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-3 bg-red-100 text-red-600 rounded-lg font-medium"
          >
            Refuser
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium"
          >
            Accepter
          </button>
        </div>
      )}

      {booking.status === 'accepted' && onStart && (
        <button
          onClick={onStart}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium"
        >
          Démarrer la course
        </button>
      )}

      {booking.status === 'in_progress' && onComplete && (
        <button
          onClick={onComplete}
          className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium"
        >
          Terminer la course
        </button>
      )}
    </div>
  );
}
EOF
}

create_pages() {
    # src/pages/LoginPage.tsx
    cat > src/pages/LoginPage.tsx << 'EOF'
import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { Loader2, Smartphone } from 'lucide-react';
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
    if (!success) setError('Email ou mot de passe incorrect');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-500 to-primary-700 p-6 safe-top">
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Smartphone size={40} className="text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">{config.tenantName}</h1>
          <p className="text-primary-100 mt-2">Application Chauffeur</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="chauffeur@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              Se connecter
            </button>
          </form>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">🔐 Identifiants de test :</p>
            <p className="text-sm text-blue-700">Email: chauffeur@demo.veeocore.fr</p>
            <p className="text-sm text-blue-700">Password: demo2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
    
    # src/pages/HomePage.tsx
    cat > src/pages/HomePage.tsx << 'EOF'
import { useAuthStore } from '../stores/auth';
import { useBookingsStore } from '../stores/bookings';
import StatusToggle from '../components/StatusToggle';
import BookingCard from '../components/BookingCard';
import { Car, Calendar, Euro } from 'lucide-react';

export default function HomePage() {
  const { driver } = useAuthStore();
  const { bookings } = useBookingsStore();
  
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const todayStats = {
    rides: bookings.filter(b => b.status === 'completed').length,
    earnings: bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.price, 0)
  };

  return (
    <div className="p-4 space-y-6 safe-top">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {driver?.name?.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Bonjour, {driver?.name?.split(' ')[0]}</h1>
            <p className="text-gray-500 text-sm">{driver?.vehicle?.model} • {driver?.vehicle?.plate}</p>
          </div>
        </div>
        <StatusToggle />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats.rides}</p>
              <p className="text-sm text-gray-500">Courses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Euro size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats.earnings}€</p>
              <p className="text-sm text-gray-500">Gains</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending bookings */}
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar size={20} />
            Nouvelles courses
          </h2>
          <div className="space-y-4">
            {pendingBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAccept={() => console.log('Accept', booking.id)}
                onReject={() => console.log('Reject', booking.id)}
              />
            ))}
          </div>
        </div>
      )}

      {pendingBookings.length === 0 && driver?.status !== 'offline' && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <Car size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">En attente de courses...</p>
        </div>
      )}
    </div>
  );
}
EOF
    
    # src/pages/BookingsPage.tsx
    cat > src/pages/BookingsPage.tsx << 'EOF'
import { useBookingsStore } from '../stores/bookings';
import BookingCard from '../components/BookingCard';
import { Calendar } from 'lucide-react';

export default function BookingsPage() {
  const { bookings } = useBookingsStore();
  const activeBookings = bookings.filter(b => 
    ['pending', 'accepted', 'in_progress'].includes(b.status)
  );

  return (
    <div className="p-4 safe-top">
      <h1 className="text-xl font-bold mb-4">Mes courses</h1>

      {activeBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune course en cours</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeBookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStart={() => console.log('Start', booking.id)}
              onComplete={() => console.log('Complete', booking.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
EOF
    
    # src/pages/RidePage.tsx
    cat > src/pages/RidePage.tsx << 'EOF'
import { useParams } from 'react-router-dom';

export default function RidePage() {
  const { id } = useParams();

  return (
    <div className="p-4 safe-top">
      <h1 className="text-xl font-bold">Course {id}</h1>
      <p className="text-gray-500">Détails de la course en cours...</p>
    </div>
  );
}
EOF
    
    # src/pages/ProfilePage.tsx
    cat > src/pages/ProfilePage.tsx << 'EOF'
import { useAuthStore } from '../stores/auth';
import { config } from '../lib/config';
import { LogOut, User, Car, Phone, Mail, Settings } from 'lucide-react';

export default function ProfilePage() {
  const { driver, logout } = useAuthStore();

  return (
    <div className="p-4 safe-top space-y-4">
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <User size={40} className="text-primary-600" />
        </div>
        <h1 className="text-xl font-bold">{driver?.name}</h1>
        <p className="text-gray-500">{config.tenantName}</p>
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        <div className="p-4 flex items-center gap-4">
          <Mail size={20} className="text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p>{driver?.email}</p>
          </div>
        </div>
        <div className="p-4 flex items-center gap-4">
          <Phone size={20} className="text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Téléphone</p>
            <p>{driver?.phone}</p>
          </div>
        </div>
        <div className="p-4 flex items-center gap-4">
          <Car size={20} className="text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Véhicule</p>
            <p>{driver?.vehicle?.model} • {driver?.vehicle?.plate}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <button className="w-full p-4 flex items-center gap-4">
          <Settings size={20} className="text-gray-400" />
          <span>Paramètres</span>
        </button>
      </div>

      <button
        onClick={logout}
        className="w-full bg-white rounded-xl shadow p-4 flex items-center justify-center gap-2 text-red-600"
      >
        <LogOut size={20} />
        Déconnexion
      </button>
    </div>
  );
}
EOF
}

create_pwa_assets() {
    # Créer un simple SVG pour les icônes PWA
    cat > public/pwa-192x192.png << 'EOF'
EOF
    
    cat > public/pwa-512x512.png << 'EOF'
EOF
    
    # On va créer un placeholder SVG
    cat > public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#3b82f6"/>
  <text x="50" y="65" font-size="50" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">V</text>
</svg>
EOF
}

# Installer les dépendances
install_dependencies() {
    log_info "Installation des dépendances..."
    npm install --silent 2>/dev/null || npm install
    log_success "Dépendances installées"
}

# Scripts de lancement
create_start_scripts() {
    log_info "Création des scripts..."
    
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Démarrage de l'App Chauffeur VeeoCore..."
npm run dev
EOF
    chmod +x start.sh
    
    cat > README.md << EOF
# VeeoCore Driver App

Application chauffeur PWA pour **$TENANT_NAME**

## Démarrage

\`\`\`bash
npm run dev     # Mode développement
npm run build   # Build production
npm run preview # Preview production
\`\`\`

## Installation PWA

1. Ouvrez l'app dans Chrome/Safari mobile
2. Menu → "Ajouter à l'écran d'accueil"

## Credentials de test

- Email: chauffeur@demo.veeocore.fr
- Password: demo2026
EOF
    
    log_success "Scripts créés"
}

# Résumé final
print_success() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ✅ App Chauffeur installée avec succès !             ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📁 Projet:${NC} $(pwd)"
    echo ""
    echo -e "${YELLOW}🚀 Démarrer:${NC}"
    echo "   cd $INSTALL_DIR"
    echo "   npm run dev"
    echo ""
    echo -e "${YELLOW}📱 Installer sur mobile:${NC}"
    echo "   1. Ouvrir http://localhost:$PORT sur mobile"
    echo "   2. Menu → 'Ajouter à l'écran d'accueil'"
    echo ""
    echo -e "${BLUE}🔐 Test:${NC} chauffeur@demo.veeocore.fr / demo2026"
    echo ""
}

# === MAIN ===
main() {
    print_logo
    parse_arguments "$@"
    check_prerequisites
    validate_credentials
    create_project
    create_package_json
    create_vite_config
    create_tsconfig
    create_tailwind_config
    create_source_files
    install_dependencies
    create_start_scripts
    cd ..
    print_success
}

main "$@"
