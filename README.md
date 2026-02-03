# ⚡ VeeoCore API

**API SaaS de calcul de prix et gestion de réservations VTC**

[![API Status](https://img.shields.io/badge/API-Live-brightgreen)](https://api-core.veeo-stras.fr)
[![Version](https://img.shields.io/badge/version-1.2.0-blue)](https://api-core.veeo-stras.fr/demo/docs.html)
[![License](https://img.shields.io/badge/license-Proprietary-red)](#license)

---

## 🎯 Présentation

VeeoCore est une API REST complète pour intégrer un système de réservation VTC dans votre application. Elle offre :

- **💰 Calcul de prix en temps réel** - Tarification dynamique basée sur la distance, le temps et les conditions
- **📅 Gestion des réservations** - Création, suivi et annulation de courses
- **🚗 Dispatch chauffeurs** - Attribution automatique des courses aux chauffeurs disponibles
- **🗺️ Géolocalisation** - Calcul d'itinéraires et estimation de temps de trajet

---

## 🚀 Démarrage rapide

### Base URL
```
https://api-core.veeo-stras.fr/api/v1
```

### Authentification
Toutes les requêtes nécessitent un header `X-API-Key` :

```bash
curl -X POST https://api-core.veeo-stras.fr/api/v1/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "origin": { "lat": 48.5734, "lng": 7.7521, "address": "Strasbourg" },
    "destination": { "lat": 48.8566, "lng": 2.3522, "address": "Paris" }
  }'
```

### Clé de test
Pour tester l'API sans inscription, utilisez `demo-key` :
```bash
-H "X-API-Key: demo-key"
```

---

## 📖 Documentation

| Ressource | Lien |
|-----------|------|
| 🎮 **Démo interactive** | [api-core.veeo-stras.fr/demo](https://api-core.veeo-stras.fr/demo/) |
| 📚 **Documentation API** | [api-core.veeo-stras.fr/demo/docs.html](https://api-core.veeo-stras.fr/demo/docs.html) |
| 📄 **OpenAPI Spec** | [api-core.veeo-stras.fr/api/v1/openapi](https://api-core.veeo-stras.fr/api/v1/openapi) |

---

## 🔌 Endpoints principaux

### Pricing
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/pricing/calculate` | Calcule le prix pour un trajet |
| `GET` | `/pricing/vehicles` | Liste les types de véhicules disponibles |

### Bookings
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/bookings` | Crée une nouvelle réservation |
| `GET` | `/bookings/:id` | Récupère une réservation |
| `PUT` | `/bookings/:id/cancel` | Annule une réservation |

### Drivers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/drivers/available` | Liste les chauffeurs disponibles |
| `POST` | `/drivers/:id/assign` | Assigne un chauffeur à une course |

---

## 💡 Exemples d'intégration

### JavaScript / Node.js

```javascript
const response = await fetch('https://api-core.veeo-stras.fr/api/v1/pricing/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    origin: { lat: 48.5734, lng: 7.7521, address: 'Strasbourg' },
    destination: { lat: 48.8566, lng: 2.3522, address: 'Paris' }
  })
});

const data = await response.json();
console.log(data.prices); // Liste des véhicules avec prix
```

### Python

```python
import requests

response = requests.post(
    'https://api-core.veeo-stras.fr/api/v1/pricing/calculate',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY'
    },
    json={
        'origin': {'lat': 48.5734, 'lng': 7.7521, 'address': 'Strasbourg'},
        'destination': {'lat': 48.8566, 'lng': 2.3522, 'address': 'Paris'}
    }
)

print(response.json()['prices'])
```

### PHP

```php
$ch = curl_init('https://api-core.veeo-stras.fr/api/v1/pricing/calculate');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-Key: YOUR_API_KEY'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'origin' => ['lat' => 48.5734, 'lng' => 7.7521, 'address' => 'Strasbourg'],
        'destination' => ['lat' => 48.8566, 'lng' => 2.3522, 'address' => 'Paris']
    ])
]);

$response = json_decode(curl_exec($ch), true);
print_r($response['prices']);
```

---

## 💳 Tarification

| Plan | Prix | Requêtes/mois | Support |
|------|------|---------------|----------|
| **Starter** | 49€/mois | 10 000 | Email |
| **Business** | 149€/mois | 100 000 | Prioritaire |
| **Enterprise** | Sur devis | Illimité | Dédié |

[Contactez-nous](mailto:contact@veeo-stras.fr) pour obtenir votre clé API.

---

## 📞 Support

- 📧 Email : [contact@veeo-stras.fr](mailto:contact@veeo-stras.fr)
- 🌐 Site : [veeo-stras.fr](https://veeo-stras.fr)
- 📖 Docs : [api-core.veeo-stras.fr/demo/docs.html](https://api-core.veeo-stras.fr/demo/docs.html)

---

## 📜 License

Ce logiciel est propriétaire. L'utilisation de l'API est soumise à nos [conditions générales](https://veeo-stras.fr/cgu).

© 2026 VeeoStras - Tous droits réservés.
