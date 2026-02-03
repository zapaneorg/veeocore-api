/**
 * Types pour le moteur de tarification
 */

// Configuration d'un type de véhicule
export interface VehicleTariff {
  vehicleType: string;
  displayName: string;
  displayOrder: number;
  baseFare: number;           // Tarif de base (€)
  perKm: number;              // Prix par kilomètre (€)
  perMinute: number;          // Prix par minute (€)
  minimumFare: number;        // Tarif minimum (€)
  additionalStopFee: number;  // Frais par arrêt supplémentaire (€)
  commissionRate: number;     // Taux de commission (0-1)
  peakHourMultiplier: number; // Multiplicateur heures de pointe
  weekendMultiplier: number;  // Multiplicateur weekend
  nightMultiplier: number;    // Multiplicateur nuit
  maxPassengers: number;      // Capacité passagers
  maxLuggage: number;         // Capacité bagages
  icon?: string;              // Icône du véhicule
  description?: string;       // Description
}

// Zone géographique avec tarification spéciale
export interface PricingZone {
  id: string;
  zoneName: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  baseMultiplier: number;     // Multiplicateur de prix
  isAirport: boolean;
  airportFee: number;         // Frais aéroport
  isStation: boolean;
  stationFee: number;         // Frais gare
  isActive: boolean;
}

// Route avec prix fixe
export interface FixedPriceRoute {
  id: string;
  originZone: string;
  destinationZone: string;
  vehicleType: string;
  fixedPrice: number;
  commissionRate: number;
  driverPayout: number;
  isActive: boolean;
  isBidirectional: boolean;
}

// Segment de route
export interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceKm: number;
  durationMin: number;
  isStop?: boolean;
}

// Paramètres de calcul de prix
export interface PriceCalculationParams {
  vehicleType: string;
  distanceKm: number;
  durationMin: number;
  bookingTime?: Date;
  routeSegments?: RouteSegment[];
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  passengers?: number;
  luggage?: number;
}

// Résultat du calcul de prix
export interface PriceResult {
  vehicleType: string;
  price: number;
  driverPayout: number;
  commission: number;
  distanceKm: number;
  durationMin: number;
  surgeMultiplier: number;
  additionalStopCount: number;
  zoneFees: number;
  isFixedPrice: boolean;
  source: 'calculated' | 'fixed_route' | 'fallback';
  breakdown: {
    baseFare: number;
    distanceCost: number;
    durationCost: number;
    stopsFee: number;
    surgeAmount: number;
    zoneFees: number;
  };
}

// Configuration globale du moteur
export interface PricingEngineConfig {
  // Limites
  maxSurgeMultiplier: number;  // Plafond surge (ex: 1.50 = +50%)
  minPrice: number;            // Prix minimum absolu
  
  // Heures de pointe
  peakHours: {
    morning: { start: number; end: number };  // ex: 7-9
    evening: { start: number; end: number };  // ex: 17-19
  };
  
  // Weekend (jours: 0=dimanche, 6=samedi)
  weekendDays: number[];
  
  // Nuit
  nightHours: { start: number; end: number }; // ex: 22-6
  
  // Timezone
  timezone: string;
  
  // Tarifs par défaut (si pas de config DB)
  defaultTariffs: VehicleTariff[];
  
  // Zones
  zones: PricingZone[];
  
  // Routes fixes
  fixedRoutes: FixedPriceRoute[];
}

// Tenant (client SaaS)
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  config: Partial<PricingEngineConfig>;
  isActive: boolean;
  plan: 'starter' | 'pro' | 'business' | 'enterprise';
  createdAt: Date;
}
