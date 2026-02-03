/**
 * Gestion des zones tarifaires
 */

import type { PricingZone } from './types';

/**
 * Calcule la distance entre deux points (formule Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Vérifie si un point est dans une zone
 */
export function isInZone(
  lat: number,
  lng: number,
  zone: PricingZone
): boolean {
  if (!zone.isActive) return false;
  
  const distance = calculateDistance(lat, lng, zone.centerLat, zone.centerLng);
  return distance <= zone.radiusKm;
}

/**
 * Trouve la zone correspondant à un point
 */
export function findZone(
  lat: number,
  lng: number,
  zones: PricingZone[]
): PricingZone | null {
  for (const zone of zones) {
    if (isInZone(lat, lng, zone)) {
      return zone;
    }
  }
  return null;
}

/**
 * Calcule les frais de zone
 */
export function calculateZoneFees(
  pickupLat: number | undefined,
  pickupLng: number | undefined,
  dropoffLat: number | undefined,
  dropoffLng: number | undefined,
  zones: PricingZone[]
): {
  totalFees: number;
  pickupZone: PricingZone | null;
  dropoffZone: PricingZone | null;
  breakdown: {
    airportPickup: number;
    airportDropoff: number;
    stationPickup: number;
    stationDropoff: number;
  };
} {
  let totalFees = 0;
  let pickupZone: PricingZone | null = null;
  let dropoffZone: PricingZone | null = null;
  
  const breakdown = {
    airportPickup: 0,
    airportDropoff: 0,
    stationPickup: 0,
    stationDropoff: 0
  };
  
  // Zone de départ
  if (pickupLat !== undefined && pickupLng !== undefined) {
    pickupZone = findZone(pickupLat, pickupLng, zones);
    if (pickupZone) {
      if (pickupZone.isAirport) {
        breakdown.airportPickup = pickupZone.airportFee;
        totalFees += pickupZone.airportFee;
      }
      if (pickupZone.isStation) {
        breakdown.stationPickup = pickupZone.stationFee;
        totalFees += pickupZone.stationFee;
      }
    }
  }
  
  // Zone d'arrivée
  if (dropoffLat !== undefined && dropoffLng !== undefined) {
    dropoffZone = findZone(dropoffLat, dropoffLng, zones);
    if (dropoffZone) {
      if (dropoffZone.isAirport) {
        breakdown.airportDropoff = dropoffZone.airportFee;
        totalFees += dropoffZone.airportFee;
      }
      if (dropoffZone.isStation) {
        breakdown.stationDropoff = dropoffZone.stationFee;
        totalFees += dropoffZone.stationFee;
      }
    }
  }
  
  return { totalFees, pickupZone, dropoffZone, breakdown };
}

/**
 * Calcule le multiplicateur de zone moyen
 */
export function calculateZoneMultiplier(
  pickupZone: PricingZone | null,
  dropoffZone: PricingZone | null
): number {
  const pickupMult = pickupZone?.baseMultiplier ?? 1.0;
  const dropoffMult = dropoffZone?.baseMultiplier ?? 1.0;
  
  // Moyenne des multiplicateurs
  return (pickupMult + dropoffMult) / 2;
}
