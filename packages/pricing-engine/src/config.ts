/**
 * Configuration par défaut du moteur de tarification
 * Basé sur le système VeeoStras
 */

import type { PricingEngineConfig, VehicleTariff, PricingZone } from './types';

// Tarifs véhicules par défaut (harmonisés avec VeeoStras)
export const defaultTariffs: VehicleTariff[] = [
  {
    vehicleType: 'standard',
    displayName: 'Standard',
    displayOrder: 1,
    baseFare: 4.50,
    perKm: 1.35,
    perMinute: 0.35,
    minimumFare: 8.00,
    additionalStopFee: 1.50,
    commissionRate: 0.20,
    peakHourMultiplier: 1.15,
    weekendMultiplier: 1.10,
    nightMultiplier: 1.05,
    maxPassengers: 4,
    maxLuggage: 3,
    icon: '🚗',
    description: 'Berline confortable pour 1-4 passagers'
  },
  {
    vehicleType: 'premium',
    displayName: 'Premium',
    displayOrder: 2,
    baseFare: 5.50,
    perKm: 1.60,
    perMinute: 0.42,
    minimumFare: 10.00,
    additionalStopFee: 2.00,
    commissionRate: 0.22,
    peakHourMultiplier: 1.18,
    weekendMultiplier: 1.12,
    nightMultiplier: 1.06,
    maxPassengers: 4,
    maxLuggage: 4,
    icon: '🚘',
    description: 'Véhicule haut de gamme'
  },
  {
    vehicleType: 'van',
    displayName: 'Van',
    displayOrder: 3,
    baseFare: 12.00,
    perKm: 2.10,
    perMinute: 0.55,
    minimumFare: 25.00,
    additionalStopFee: 2.50,
    commissionRate: 0.20,
    peakHourMultiplier: 1.15,
    weekendMultiplier: 1.10,
    nightMultiplier: 1.05,
    maxPassengers: 8,
    maxLuggage: 8,
    icon: '🚐',
    description: 'Minivan pour groupes jusqu\'à 8 personnes'
  },
  {
    vehicleType: 'eco',
    displayName: 'Eco',
    displayOrder: 4,
    baseFare: 3.50,
    perKm: 1.10,
    perMinute: 0.28,
    minimumFare: 6.00,
    additionalStopFee: 1.00,
    commissionRate: 0.18,
    peakHourMultiplier: 1.10,
    weekendMultiplier: 1.05,
    nightMultiplier: 1.03,
    maxPassengers: 4,
    maxLuggage: 2,
    icon: '🌱',
    description: 'Option économique et écologique'
  }
];

// Configuration par défaut
export const defaultConfig: PricingEngineConfig = {
  // Plafond surge à 50% maximum
  maxSurgeMultiplier: 1.50,
  minPrice: 5.00,
  
  // Heures de pointe
  peakHours: {
    morning: { start: 7, end: 9 },
    evening: { start: 17, end: 19 }
  },
  
  // Weekend: vendredi soir et samedi
  weekendDays: [5, 6], // 5=vendredi, 6=samedi
  
  // Nuit: 22h-6h
  nightHours: { start: 22, end: 6 },
  
  // Timezone
  timezone: 'Europe/Paris',
  
  // Tarifs par défaut
  defaultTariffs,
  
  // Zones (vide par défaut, à configurer par tenant)
  zones: [],
  
  // Routes fixes (vide par défaut)
  fixedRoutes: []
};

/**
 * Crée une configuration personnalisée
 */
export function createConfig(overrides: Partial<PricingEngineConfig>): PricingEngineConfig {
  return {
    ...defaultConfig,
    ...overrides,
    peakHours: {
      ...defaultConfig.peakHours,
      ...overrides.peakHours
    },
    nightHours: {
      ...defaultConfig.nightHours,
      ...overrides.nightHours
    },
    defaultTariffs: overrides.defaultTariffs || defaultConfig.defaultTariffs,
    zones: overrides.zones || defaultConfig.zones,
    fixedRoutes: overrides.fixedRoutes || defaultConfig.fixedRoutes
  };
}

/**
 * Exemples de zones pour configuration initiale
 */
export const exampleZones: PricingZone[] = [
  {
    id: 'airport',
    zoneName: 'Aéroport',
    centerLat: 48.5381,
    centerLng: 7.6283,
    radiusKm: 3,
    baseMultiplier: 1.0,
    isAirport: true,
    airportFee: 5.00,
    isStation: false,
    stationFee: 0,
    isActive: true
  },
  {
    id: 'station',
    zoneName: 'Gare Centrale',
    centerLat: 48.5851,
    centerLng: 7.7350,
    radiusKm: 0.5,
    baseMultiplier: 1.0,
    isAirport: false,
    airportFee: 0,
    isStation: true,
    stationFee: 2.00,
    isActive: true
  },
  {
    id: 'center',
    zoneName: 'Centre-ville',
    centerLat: 48.5734,
    centerLng: 7.7521,
    radiusKm: 2,
    baseMultiplier: 1.0,
    isAirport: false,
    airportFee: 0,
    isStation: false,
    stationFee: 0,
    isActive: true
  }
];
