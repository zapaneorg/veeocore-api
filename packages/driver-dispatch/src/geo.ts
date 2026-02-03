/**
 * Utilitaires géographiques pour le dispatch
 */

import type { Driver } from './types';

/**
 * Calcule la distance entre deux points (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon Terre en km
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
 * Estime le temps de trajet en minutes (approximatif)
 */
export function estimateTravelTime(distanceKm: number, avgSpeedKmh: number = 30): number {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Trouve les chauffeurs les plus proches
 */
export function findNearestDrivers(
  pickupLat: number,
  pickupLng: number,
  drivers: Driver[],
  options: {
    maxDistance?: number;
    maxResults?: number;
    vehicleType?: string;
    statusFilter?: Driver['status'][];
  } = {}
): Array<Driver & { distance: number; estimatedArrival: number }> {
  const {
    maxDistance = 10,
    maxResults = 10,
    vehicleType,
    statusFilter = ['available']
  } = options;
  
  return drivers
    // Filtrer chauffeurs actifs avec position
    .filter(driver => 
      driver.isActive &&
      driver.currentLocation &&
      statusFilter.includes(driver.status) &&
      (!vehicleType || driver.vehicleType === vehicleType)
    )
    // Calculer distance
    .map(driver => {
      const distance = calculateDistance(
        pickupLat,
        pickupLng,
        driver.currentLocation!.lat,
        driver.currentLocation!.lng
      );
      const estimatedArrival = estimateTravelTime(distance);
      
      return { ...driver, distance, estimatedArrival };
    })
    // Filtrer par distance max
    .filter(driver => driver.distance <= maxDistance)
    // Trier par distance
    .sort((a, b) => a.distance - b.distance)
    // Limiter résultats
    .slice(0, maxResults);
}

/**
 * Vérifie si un chauffeur est dans la zone de travail
 */
export function isDriverInWorkArea(
  driver: Driver,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  if (!driver.currentLocation) return false;
  
  const distance = calculateDistance(
    driver.currentLocation.lat,
    driver.currentLocation.lng,
    centerLat,
    centerLng
  );
  
  return distance <= radiusKm;
}

/**
 * Calcule le bounding box pour une recherche géographique
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusKm: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  // Approximation: 1 degré lat ≈ 111km, 1 degré lng varie selon lat
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));
  
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta
  };
}
