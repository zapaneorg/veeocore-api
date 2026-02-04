"""
VeeoCore API - Exemple Python
Calcul de prix pour un trajet VTC
"""

import requests
import json

API_BASE = 'https://api-core.veeo-stras.fr/api/v1'
API_KEY = 'YOUR_API_KEY'  # Remplacez par votre clé API


def calculate_price(origin: dict, destination: dict) -> dict:
    """Calcule le prix d'un trajet VTC."""
    response = requests.post(
        f'{API_BASE}/pricing/calculate',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        },
        json={
            'origin': origin,
            'destination': destination
        }
    )
    response.raise_for_status()
    return response.json()


def main():
    origin = {
        'lat': 48.5734,
        'lng': 7.7521,
        'address': 'Gare de Strasbourg'
    }

    destination = {
        'lat': 48.5853,
        'lng': 7.7350,
        'address': 'Aéroport de Strasbourg-Entzheim'
    }

    print('Calcul du prix...')
    result = calculate_price(origin, destination)

    print(f"\n📍 Trajet: {result['distance_km']} km - {result['duration_min']} min")

    print('\n💰 Prix par véhicule:')
    for vehicle in result['prices']:
        print(f"   {vehicle['name']}: {vehicle['price']}€")


if __name__ == '__main__':
    main()
