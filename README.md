# 🚗 VeeoCore

**Plateforme SaaS multi-tenant pour la gestion de flottes VTC** - Calcul de prix, dispatch chauffeurs, réservations, paiements Stripe.

## 📦 Architecture

```
VeeoCore/
├── packages/
│   ├── pricing-engine/     # Moteur de calcul de prix @veeo/pricing-engine
│   ├── driver-dispatch/    # Système de dispatch @veeo/driver-dispatch
│   └── widget/             # Widget JS embeddable @veeo/widget
├── apps/
│   ├── api/                # API REST multi-tenant (Express + Supabase)
│   ├── admin/              # Dashboard super-admin (React + Vite)
│   ├── tenant-admin/       # Dashboard exploitant VTC (React + Vite)
│   └── driver/             # App mobile chauffeur (React PWA)
├── supabase/
│   └── migrations/         # Migrations SQL
├── scripts/                # Scripts utilitaires
└── docs/                   # Documentation
```

## ✨ Fonctionnalités

### 📊 Pricing Engine (`@veeo/pricing-engine`)
- Calcul de prix basé sur distance, durée, type de véhicule
- Surge pricing dynamique (heures de pointe, nuit, weekend)
- Zones tarifaires (aéroports, gares)
- Prix fixes pour trajets courants
- Plafonnement automatique du surge (max 1.50)

### 🚗 Driver Dispatch (`@veeo/driver-dispatch`)
- Algorithmes d'assignation (proximité, file d'attente, note, équilibré)
- Notifications multi-canal (push, email, SMS, webhook)
- Gestion des statuts chauffeurs en temps réel
- Géolocalisation et calcul de distances

### 🎨 Widget (`@veeo/widget`)
- Widget JavaScript embeddable
- Personnalisation complète (thème, couleurs, locale)
- Intégration en 2 lignes de code
- Callbacks pour intégration avancée

### 🔒 API Multi-tenant
- Authentification par clé API pour les clients
- Authentification JWT pour l'admin et les chauffeurs
- Isolation des données par tenant (RLS)
- Rate limiting par plan
- Webhooks pour événements temps réel

### 💳 Paiements Stripe
- PaymentIntent pour les paiements
- Webhooks Stripe sécurisés
- Remboursements automatisés
- Gestion des litiges

### 🔔 Temps Réel (WebSocket)
- Notifications push pour les chauffeurs
- Mise à jour position chauffeurs
- Alertes nouvelles courses
- Statuts réservations en direct

## 🚀 Démarrage Rapide

```bash
# Cloner le projet
git clone https://github.com/votre-org/veeocore.git
cd veeocore

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env

# Lancer en développement
npm run dev

# Ou séparément
npm run dev:api           # API sur http://localhost:4000
npm run dev:admin         # Super Admin sur http://localhost:5173
npm run dev:tenant-admin  # Tenant Admin sur http://localhost:5174
npm run dev:driver        # Driver App sur http://localhost:5175
```

## 🔧 Variables d'Environnement

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# JWT
JWT_SECRET=votre-secret-jwt

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

## 🏗️ Applications

### 1. API (`apps/api`) - Port 4000
Backend Express avec toutes les routes API.

**Endpoints principaux:**
- `POST /api/v1/pricing/quote` - Calculer un prix
- `POST /api/v1/bookings` - Créer une réservation
- `GET /api/v1/drivers/available` - Chauffeurs disponibles
- `POST /api/v1/dispatch/auto` - Auto-dispatch
- `POST /api/v1/stripe/webhook/:tenantId` - Webhooks Stripe

### 2. Tenant Admin (`apps/tenant-admin`) - Port 5174
Dashboard pour les exploitants VTC.

**Fonctionnalités:**
- Vue d'ensemble (stats, graphiques)
- Gestion des réservations
- Gestion des chauffeurs
- Configuration tarifs
- Rapports & exports

### 3. Driver App (`apps/driver`) - Port 5175
Application mobile PWA pour les chauffeurs.

**Fonctionnalités:**
- Connexion par téléphone + PIN
- Réception des courses en temps réel
- Navigation GPS intégrée
- Mise à jour statuts
- Historique & gains

## 📊 Base de données

Tables principales:
- `tenants` - Clients API (exploitants VTC)
- `tenant_admins` - Administrateurs des tenants
- `drivers` - Chauffeurs
- `bookings` - Réservations
- `pricing_config` - Configuration tarification
- `pricing_zones` - Zones tarifaires
- `tenant_payments` - Historique paiements

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Script d'intégration rapide
./scripts/test-integration.sh http://localhost:4000
```

## 💰 Modèle Tarifaire Clients

| Plan       | Prix/mois | Véhicules | Fonctionnalités           |
|------------|-----------|-----------|---------------------------|
| Starter    | 49€       | 1-3       | Pricing + Widget          |
| Pro        | 149€      | 10        | + Dispatch + Analytics    |
| Business   | 399€      | Illimité  | + API + Marque blanche    |
| Enterprise | Sur devis | Multi-sites | Support dédié           |

## 🔧 Configuration

Créer `.env` à la racine :

```env
# Supabase (votre projet ou celui du client)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# API
API_PORT=4000
API_SECRET=votre_secret_jwt

# Google Maps (pour calcul distances)
GOOGLE_MAPS_API_KEY=xxx
```

## 📚 Documentation

- [Guide d'intégration](./docs/integration-guide.md)
- [API Reference](./docs/api-reference.md)
- [Configuration Pricing](./docs/pricing-config.md)

## 📄 License

Propriétaire - Tous droits réservés VeeoStras
