/**
 * Gestion des prix fixes par route
 */

import type { FixedPriceRoute } from './types';

/**
 * Vérifie si une route a un prix fixe
 */
export function hasFixedRoute(
  originZone: string | null,
  destinationZone: string | null,
  vehicleType: string,
  fixedRoutes: FixedPriceRoute[]
): boolean {
  if (!originZone || !destinationZone) return false;
  
  return fixedRoutes.some(route => 
    route.isActive &&
    route.vehicleType === vehicleType &&
    (
      (route.originZone === originZone && route.destinationZone === destinationZone) ||
      (route.isBidirectional && route.originZone === destinationZone && route.destinationZone === originZone)
    )
  );
}

/**
 * Récupère le prix fixe pour une route
 */
export function getFixedPrice(
  originZone: string | null,
  destinationZone: string | null,
  vehicleType: string,
  fixedRoutes: FixedPriceRoute[]
): FixedPriceRoute | null {
  if (!originZone || !destinationZone) return null;
  
  return fixedRoutes.find(route => 
    route.isActive &&
    route.vehicleType === vehicleType &&
    (
      (route.originZone === originZone && route.destinationZone === destinationZone) ||
      (route.isBidirectional && route.originZone === destinationZone && route.destinationZone === originZone)
    )
  ) || null;
}

/**
 * Calcule le prix fixe avec les détails
 */
export function calculateFixedPrice(
  originZone: string | null,
  destinationZone: string | null,
  vehicleType: string,
  fixedRoutes: FixedPriceRoute[]
): {
  isFixed: boolean;
  price: number;
  driverPayout: number;
  commission: number;
  route: FixedPriceRoute | null;
} {
  const route = getFixedPrice(originZone, destinationZone, vehicleType, fixedRoutes);
  
  if (!route) {
    return {
      isFixed: false,
      price: 0,
      driverPayout: 0,
      commission: 0,
      route: null
    };
  }
  
  return {
    isFixed: true,
    price: route.fixedPrice,
    driverPayout: route.driverPayout,
    commission: route.fixedPrice - route.driverPayout,
    route
  };
}

/**
 * Exemples de routes fixes
 */
export const exampleFixedRoutes: FixedPriceRoute[] = [
  {
    id: 'airport-station',
    originZone: 'Aéroport',
    destinationZone: 'Gare Centrale',
    vehicleType: 'standard',
    fixedPrice: 35.00,
    commissionRate: 0.20,
    driverPayout: 28.00,
    isActive: true,
    isBidirectional: true
  },
  {
    id: 'airport-center',
    originZone: 'Aéroport',
    destinationZone: 'Centre-ville',
    vehicleType: 'standard',
    fixedPrice: 32.00,
    commissionRate: 0.20,
    driverPayout: 25.60,
    isActive: true,
    isBidirectional: true
  },
  {
    id: 'station-center',
    originZone: 'Gare Centrale',
    destinationZone: 'Centre-ville',
    vehicleType: 'standard',
    fixedPrice: 12.00,
    commissionRate: 0.20,
    driverPayout: 9.60,
    isActive: true,
    isBidirectional: true
  }
];
