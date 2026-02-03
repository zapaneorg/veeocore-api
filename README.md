# 🚗 VeeoCore

**Plateforme SaaS multi-tenant pour la gestion de flottes VTC** - Calcul de prix, dispatch chauffeurs, réservations.

## 📦 Architecture

```
VeeoCore/
├── packages/
│   ├── pricing-engine/     # Moteur de calcul de prix @veeo/pricing-engine
│   ├── driver-dispatch/    # Système de dispatch @veeo/driver-dispatch
│   └── widget/             # Widget JS embeddable @veeo/widget
├── apps/
│   ├── api/                # API REST multi-tenant (Express + Supabase)
│   └── admin/              # Dashboard d'administration (React + Vite)
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
- Authentification JWT pour l'admin
- Isolation des données par tenant
- Rate limiting
- Webhooks pour événements temps réel

## 🚀 Démarrage Rapide

```bash
# Cloner le projet
git clone https://github.com/votre-org/veeocore.git
cd veeocore

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env

# Lancer en développement (API + Admin)
npm run dev

# Ou séparément
npm run dev:api    # API sur http://localhost:4000
npm run dev:admin  # Admin sur http://localhost:5173
```

## 💡 Fonctionnalités

### Pricing Engine
- ✅ Calcul dynamique (distance, durée, heure)
- ✅ Surge pricing (heures de pointe, nuit, weekend)
- ✅ Tarification par zones (aéroport, gare)
- ✅ Prix fixes pour trajets prédéfinis
- ✅ Multi-véhicules configurable

### Driver Dispatch
- ✅ Notification push temps réel
- ✅ Assignation automatique par proximité
- ✅ Gestion statuts chauffeurs
- ✅ Webhooks personnalisables

### Widget Embeddable
```html
<script src="https://cdn.veeocore.com/widget.js" 
        data-api-key="votre_cle_api"
        data-theme="light">
</script>
<div id="veeo-booking"></div>
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
