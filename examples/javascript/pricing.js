/**
 * VeeoCore API - Exemple JavaScript
 * Calcul de prix pour un trajet VTC
 */

const API_BASE = 'https://api-core.veeo-stras.fr/api/v1';
const API_KEY = 'YOUR_API_KEY'; // Remplacez par votre clé API

async function calculatePrice(origin, destination) {
  try {
    const response = await fetch(`${API_BASE}/pricing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ origin, destination })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur API:', error.message);
    throw error;
  }
}

// Exemple d'utilisation
async function main() {
  const origin = {
    lat: 48.5734,
    lng: 7.7521,
    address: 'Gare de Strasbourg'
  };

  const destination = {
    lat: 48.5853,
    lng: 7.7350,
    address: 'Aéroport de Strasbourg-Entzheim'
  };

  console.log('Calcul du prix...');
  const result = await calculatePrice(origin, destination);

  console.log('\n📍 Trajet:');
  console.log(`   ${result.distance_km} km - ${result.duration_min} min`);

  console.log('\n💰 Prix par véhicule:');
  result.prices.forEach(vehicle => {
    console.log(`   ${vehicle.name}: ${vehicle.price}€`);
  });
}

main();
