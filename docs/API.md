# 📚 VeeoCore API Documentation

**Base URL:** `https://api-core.veeo-stras.fr`  
**Version:** 1.0.0

---

## 🔐 Authentification

Toutes les requêtes API nécessitent une clé API dans le header :

```http
X-API-Key: votre_cle_api
```

### Obtenir une clé API

Contactez-nous pour obtenir vos credentials :
- **Email:** api@veeo-stras.fr
- **Plans disponibles:** Starter, Pro, Enterprise

---

## 📡 Endpoints

### Statut

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Informations API |
| GET | `/health` | Statut de l'API |
| GET | `/api` | Liste des endpoints |

---

## 💰 Pricing (Calcul de prix)

### Calculer un prix unique

```http
POST /api/v1/pricing/quote
```

**Headers:**
```http
Content-Type: application/json
X-API-Key: votre_cle_api
```

**Body:**
```json
{
  "distanceKm": 15.2,
  "durationMin": 22,
  "vehicleType": "standard",
  "bookingTime": "2026-02-03T14:30:00Z",
  "pickup": {
    "lat": 48.5734,
    "lng": 7.7521
  },
  "dropoff": {
    "lat": 48.5383,
    "lng": 7.6283
  },
  "passengers": 2,
  "luggage": 2
}
```

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `distanceKm` | number | ✅ | Distance en kilomètres |
| `durationMin` | number | ✅ | Durée estimée en minutes |
| `vehicleType` | string | ✅ | Type de véhicule (`standard`, `premium`, `van`) |
| `bookingTime` | string | ❌ | Date/heure ISO 8601 (pour calcul surge) |
| `pickup` | object | ❌ | Coordonnées de départ |
| `dropoff` | object | ❌ | Coordonnées d'arrivée |
| `passengers` | number | ❌ | Nombre de passagers (défaut: 1) |
| `luggage` | number | ❌ | Nombre de bagages (défaut: 0) |

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "quote": {
      "vehicleType": "standard",
      "price": 32.72,
      "driverPayout": 26.18,
      "commission": 6.54,
      "distanceKm": 15.2,
      "durationMin": 22,
      "surgeMultiplier": 1,
      "isFixedPrice": false,
      "breakdown": {
        "baseFare": 4.50,
        "distanceCost": 20.52,
        "durationCost": 7.70,
        "surgeAmount": 0
      }
    },
    "calculatedAt": "2026-02-03T17:55:16.546Z",
    "validFor": 300
  }
}
```

---

### Calculer tous les prix

```http
POST /api/v1/pricing/calculate
```

Retourne les prix pour tous les types de véhicules disponibles.

**Body:** (identique à `/quote` mais sans `vehicleType`)

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "vehicleType": "standard",
        "price": 32.72,
        "...": "..."
      },
      {
        "vehicleType": "premium",
        "price": 42.50,
        "...": "..."
      },
      {
        "vehicleType": "van",
        "price": 58.00,
        "...": "..."
      }
    ],
    "calculatedAt": "2026-02-03T17:55:16.546Z",
    "validFor": 300
  }
}
```

---

## 📅 Bookings (Réservations)

### Créer une réservation

```http
POST /api/v1/bookings
```

**Body:**
```json
{
  "customerName": "Jean Dupont",
  "customerPhone": "+33612345678",
  "customerEmail": "jean@example.com",
  "pickup": {
    "address": "Gare de Strasbourg, 67000",
    "lat": 48.5734,
    "lng": 7.7521
  },
  "dropoff": {
    "address": "Aéroport de Strasbourg, 67960",
    "lat": 48.5383,
    "lng": 7.6283
  },
  "vehicleType": "standard",
  "passengers": 2,
  "luggage": 2,
  "scheduledFor": "2026-02-03T14:30:00Z",
  "estimatedPrice": 32.72,
  "estimatedDistance": 15.2,
  "estimatedDuration": 22,
  "paymentMethod": "card",
  "customerNotes": "Merci de m'appeler à l'arrivée"
}
```

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `customerName` | string | ✅ | Nom du client |
| `customerPhone` | string | ✅ | Téléphone du client |
| `customerEmail` | string | ❌ | Email du client |
| `pickup` | object | ✅ | Adresse et coordonnées de départ |
| `dropoff` | object | ✅ | Adresse et coordonnées d'arrivée |
| `vehicleType` | string | ✅ | Type de véhicule |
| `passengers` | number | ❌ | Nombre de passagers (défaut: 1) |
| `luggage` | number | ❌ | Nombre de bagages (défaut: 0) |
| `scheduledFor` | string | ❌ | Date/heure programmée (null = immédiat) |
| `estimatedPrice` | number | ✅ | Prix estimé (depuis /pricing/quote) |
| `estimatedDistance` | number | ✅ | Distance en km |
| `estimatedDuration` | number | ✅ | Durée en minutes |
| `paymentMethod` | string | ❌ | `cash`, `card`, `invoice` (défaut: card) |
| `customerNotes` | string | ❌ | Notes du client |

**Réponse (201):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "pending",
      "customerName": "Jean Dupont",
      "pickup": { ... },
      "dropoff": { ... },
      "totalPrice": 32.72,
      "createdAt": "2026-02-03T17:55:16.546Z"
    }
  }
}
```

---

### Lister les réservations

```http
GET /api/v1/bookings
```

**Query parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | Filtrer par statut |
| `driverId` | uuid | Filtrer par chauffeur |
| `from` | string | Date de début (ISO 8601) |
| `to` | string | Date de fin (ISO 8601) |
| `limit` | number | Nombre de résultats (défaut: 50) |
| `offset` | number | Pagination offset (défaut: 0) |

**Statuts possibles:**
- `pending` - En attente d'assignation
- `assigned` - Chauffeur assigné
- `en_route` - Chauffeur en route
- `arrived` - Chauffeur arrivé
- `in_progress` - Course en cours
- `completed` - Terminée
- `cancelled` - Annulée

---

### Détails d'une réservation

```http
GET /api/v1/bookings/:id
```

---

### Annuler une réservation

```http
POST /api/v1/bookings/:id/cancel
```

**Body:**
```json
{
  "reason": "Client indisponible"
}
```

---

## 🚗 Drivers (Chauffeurs)

### Lister les chauffeurs

```http
GET /api/v1/drivers
```

**Query parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | `available`, `busy`, `offline`, `on_break` |
| `vehicleType` | string | Type de véhicule |
| `limit` | number | Nombre de résultats |
| `offset` | number | Pagination offset |

---

### Chauffeurs disponibles

```http
GET /api/v1/drivers/available
```

**Query parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `vehicleType` | string | Filtrer par type |
| `lat` | number | Latitude (pour tri par distance) |
| `lng` | number | Longitude |
| `radius` | number | Rayon en km (défaut: 10) |

---

### Créer un chauffeur

```http
POST /api/v1/drivers
```

**Body:**
```json
{
  "firstName": "Thomas",
  "lastName": "Müller",
  "email": "thomas@example.com",
  "phone": "+33612345678",
  "vehicleType": "standard",
  "vehiclePlate": "AB-123-CD",
  "preferences": {
    "acceptsAirport": true,
    "acceptsLongDistance": true,
    "maxDistance": 100
  }
}
```

---

### Mettre à jour la position

```http
POST /api/v1/drivers/:id/location
```

**Body:**
```json
{
  "lat": 48.5734,
  "lng": 7.7521
}
```

---

### Mettre à jour le statut

```http
POST /api/v1/drivers/:id/status
```

**Body:**
```json
{
  "status": "available"
}
```

---

## ⚠️ Erreurs

### Format des erreurs

```json
{
  "error": "ERROR_CODE",
  "message": "Description de l'erreur",
  "details": []
}
```

### Codes d'erreur

| Code HTTP | Code erreur | Description |
|-----------|-------------|-------------|
| 400 | `VALIDATION_ERROR` | Paramètres invalides |
| 401 | `API_KEY_REQUIRED` | Clé API manquante |
| 401 | `INVALID_API_KEY` | Clé API invalide |
| 403 | `ACCOUNT_DISABLED` | Compte désactivé |
| 404 | `NOT_FOUND` | Ressource non trouvée |
| 429 | `RATE_LIMIT` | Trop de requêtes |
| 500 | `SERVER_ERROR` | Erreur serveur |

---

## 📊 Rate Limiting

| Plan | Requêtes/min | Requêtes/jour |
|------|--------------|---------------|
| Starter | 60 | 10,000 |
| Pro | 300 | 100,000 |
| Enterprise | Illimité | Illimité |

---

## 🔗 Webhooks

Configurez vos webhooks pour recevoir des notifications en temps réel.

### Événements disponibles

| Événement | Description |
|-----------|-------------|
| `booking.created` | Nouvelle réservation |
| `booking.assigned` | Chauffeur assigné |
| `booking.started` | Course démarrée |
| `booking.completed` | Course terminée |
| `booking.cancelled` | Course annulée |
| `driver.status_changed` | Statut chauffeur modifié |

### Format du webhook

```json
{
  "event": "booking.created",
  "timestamp": "2026-02-03T17:55:16.546Z",
  "data": {
    "booking": { ... }
  },
  "signature": "sha256=..."
}
```

---

## 💻 Exemples

### cURL

```bash
# Calculer un prix
curl -X POST https://api-core.veeo-stras.fr/api/v1/pricing/quote \
  -H "Content-Type: application/json" \
  -H "X-API-Key: votre_cle_api" \
  -d '{
    "distanceKm": 15.2,
    "durationMin": 22,
    "vehicleType": "standard"
  }'
```

### JavaScript

```javascript
const response = await fetch('https://api-core.veeo-stras.fr/api/v1/pricing/quote', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'votre_cle_api'
  },
  body: JSON.stringify({
    distanceKm: 15.2,
    durationMin: 22,
    vehicleType: 'standard'
  })
});

const data = await response.json();
console.log(data.data.quote.price); // 32.72
```

### Python

```python
import requests

response = requests.post(
    'https://api-core.veeo-stras.fr/api/v1/pricing/quote',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'votre_cle_api'
    },
    json={
        'distanceKm': 15.2,
        'durationMin': 22,
        'vehicleType': 'standard'
    }
)

data = response.json()
print(data['data']['quote']['price'])  # 32.72
```

### PHP

```php
$response = file_get_contents('https://api-core.veeo-stras.fr/api/v1/pricing/quote', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            'X-API-Key: votre_cle_api'
        ],
        'content' => json_encode([
            'distanceKm' => 15.2,
            'durationMin' => 22,
            'vehicleType' => 'standard'
        ])
    ]
]));

$data = json_decode($response, true);
echo $data['data']['quote']['price']; // 32.72
```

---

## 📞 Support

- **Email:** api@veeo-stras.fr
- **Documentation:** https://api-core.veeo-stras.fr/api
- **Status:** https://api-core.veeo-stras.fr/health

---

*Dernière mise à jour : 3 février 2026*
