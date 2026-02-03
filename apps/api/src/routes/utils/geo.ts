/**
 * Utilitaires géographiques
 */

/**
 * Calcule la distance en km entre deux points (formule de Haversine)
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
 * Vérifie si un point est dans un polygone
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Vérifie si un point est dans un cercle
 */
export function isPointInCircle(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusKm: number
): boolean {
  const distance = calculateDistance(point.lat, point.lng, center.lat, center.lng);
  return distance <= radiusKm;
}

/**
 * Calcule le centre d'un ensemble de points
 */
export function calculateCentroid(
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }
  
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length
  };
}

/**
 * Calcule la bounding box d'un ensemble de points
 */
export function calculateBoundingBox(
  points: Array<{ lat: number; lng: number }>
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }
  
  return {
    minLat: Math.min(...points.map(p => p.lat)),
    maxLat: Math.max(...points.map(p => p.lat)),
    minLng: Math.min(...points.map(p => p.lng)),
    maxLng: Math.max(...points.map(p => p.lng))
  };
}

export default {
  calculateDistance,
  isPointInPolygon,
  isPointInCircle,
  calculateCentroid,
  calculateBoundingBox
};
