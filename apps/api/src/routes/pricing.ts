/**
 * Routes API - Pricing (Calcul des prix)
 * Utilise le vrai @veeo/pricing-engine
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { metrics } from '../lib/metrics';
import { calculateDistance } from './utils/geo';

const router = Router();

// Schéma de validation (compatible VeeoStras)
const calculatePriceSchema = z.object({
  distanceKm: z.number().positive(),
  durationMin: z.number().positive(),
  vehicleType: z.string().optional(),
  bookingTime: z.string().datetime().optional(),
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }).optional(),
  dropoff: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }).optional(),
  stops: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  })).optional(),
  passengers: z.number().int().positive().default(1),
  luggage: z.number().int().min(0).default(0),
  // Paramètres avancés VeeoStras
  trafficLevel: z.enum(['low', 'normal', 'high', 'severe']).default('normal'),
  weather: z.enum(['clear', 'rain', 'snow', 'storm']).default('clear')
});

// Types pour les tarifs (compatible VeeoStras vehicle_tariff_matrix)
interface VehicleTariff {
  vehicleType: string;
  displayOrder: number;
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  minimum: number;
  additionalStopFee: number;
  commission: number;
  peakHourMultiplier: number;
  weekendMultiplier: number;
  nightMultiplier: number;
  maxPassengers: number;
  maxLuggage: number;
  features: string[];
}

// Tarifs par défaut - Réplique exacte de VeeoStras vehicle_tariff_matrix
const DEFAULT_TARIFFS: VehicleTariff[] = [
  {
    vehicleType: 'veeo_x',
    displayOrder: 1,
    name: 'Veeo X',
    description: 'Berline confort, idéal pour 1-3 passagers',
    baseFare: 4.50,
    perKm: 1.35,
    perMin: 0.35,
    minimum: 8.00,
    additionalStopFee: 1.80,
    commission: 0.20,
    peakHourMultiplier: 1.15,
    weekendMultiplier: 1.10,
    nightMultiplier: 1.05,
    maxPassengers: 4,
    maxLuggage: 3,
    features: ['Climatisation', 'Chargeurs USB', 'Eau offerte']
  },
  {
    vehicleType: 'veeo_pet',
    displayOrder: 2,
    name: 'Veeo Pet',
    description: 'Accepte vos animaux de compagnie',
    baseFare: 4.80,
    perKm: 1.38,
    perMin: 0.35,
    minimum: 8.50,
    additionalStopFee: 2.20,
    commission: 0.22,
    peakHourMultiplier: 1.15,
    weekendMultiplier: 1.12,
    nightMultiplier: 1.05,
    maxPassengers: 4,
    maxLuggage: 2,
    features: ['Animaux acceptés', 'Housse protection', 'Eau pour animal']
  },
  {
    vehicleType: 'veeo_vite',
    displayOrder: 3,
    name: 'Veeo Vite',
    description: 'Course rapide, conducteur le plus proche',
    baseFare: 5.00,
    perKm: 1.45,
    perMin: 0.38,
    minimum: 9.00,
    additionalStopFee: 1.90,
    commission: 0.21,
    peakHourMultiplier: 1.18,
    weekendMultiplier: 1.12,
    nightMultiplier: 1.05,
    maxPassengers: 4,
    maxLuggage: 2,
    features: ['Arrivée express', 'Suivi temps réel', 'Notification chauffeur']
  },
  {
    vehicleType: 'veeo_xl',
    displayOrder: 4,
    name: 'Veeo XL',
    description: 'SUV spacieux pour groupes ou bagages',
    baseFare: 6.00,
    perKm: 1.70,
    perMin: 0.45,
    minimum: 11.00,
    additionalStopFee: 2.50,
    commission: 0.25,
    peakHourMultiplier: 1.20,
    weekendMultiplier: 1.15,
    nightMultiplier: 1.08,
    maxPassengers: 6,
    maxLuggage: 6,
    features: ['Grand coffre', 'Siège enfant dispo', 'Climatisation zone']
  },
  {
    vehicleType: 'veeo_van',
    displayOrder: 5,
    name: 'Veeo Van',
    description: 'Van 8 places pour groupes et événements',
    baseFare: 12.00,
    perKm: 2.50,
    perMin: 0.50,
    minimum: 28.00,
    additionalStopFee: 5.00,
    commission: 0.22,
    peakHourMultiplier: 1.25,
    weekendMultiplier: 1.20,
    nightMultiplier: 1.15,
    maxPassengers: 8,
    maxLuggage: 8,
    features: ['WiFi gratuit', '8 bagages inclus', 'Sièges enfant gratuits', 'Accès PMR possible']
  }
];

/**
 * Charge la configuration de tarification du tenant
 * Si pas de config personnalisée, utilise les tarifs VeeoStras par défaut
 */
async function loadTenantPricingConfig(tenantId: string) {
  // Pour le tenant demo, toujours utiliser les tarifs VeeoStras
  if (tenantId === 'demo-tenant-12345' || tenantId.startsWith('demo')) {
    return null; // Force DEFAULT_TARIFFS
  }
  
  const { data } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  
  return data;
}

/**
 * Calcule les facteurs de surge selon l'algorithme VeeoStras
 * Utilise les multiplicateurs spécifiques de chaque type de véhicule
 */
function calculateSurgeFactors(
  bookingTime: string | undefined,
  tariff: VehicleTariff
): {
  multiplier: number;
  reasons: string[];
  breakdown: {
    peakHour: number;
    weekend: number;
    night: number;
  };
} {
  const date = bookingTime ? new Date(bookingTime) : new Date();
  
  // Convertir en heure locale (Europe/Paris)
  const parisTime = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const hour = parisTime.getHours();
  const day = parisTime.getDay(); // 0 = dimanche, 5 = vendredi, 6 = samedi
  
  let multiplier = 1.0;
  const reasons: string[] = [];
  const breakdown = {
    peakHour: 1.0,
    weekend: 1.0,
    night: 1.0
  };

  // Heures de pointe (7h-9h et 17h-19h)
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
    multiplier *= tariff.peakHourMultiplier;
    breakdown.peakHour = tariff.peakHourMultiplier;
    reasons.push('peak_hours');
  }

  // Weekend (vendredi soir et samedi) - dow 5 = vendredi, 6 = samedi
  if (day === 5 || day === 6) {
    multiplier *= tariff.weekendMultiplier;
    breakdown.weekend = tariff.weekendMultiplier;
    reasons.push('weekend');
  }

  // Nuit (22h-6h)
  if (hour >= 22 || hour < 6) {
    multiplier *= tariff.nightMultiplier;
    breakdown.night = tariff.nightMultiplier;
    reasons.push('night');
  }

  // Garantir minimum de 1 et plafond à 1.50 (comme VeeoStras)
  multiplier = Math.max(multiplier, 1);
  multiplier = Math.min(multiplier, 1.50);

  return { 
    multiplier: Math.round(multiplier * 1000) / 1000, 
    reasons,
    breakdown
  };
}

/**
 * Vérifie si un trajet correspond à une route à prix fixe
 */
async function checkFixedPriceRoute(
  tenantId: string,
  pickup?: { lat: number; lng: number },
  dropoff?: { lat: number; lng: number }
): Promise<{ found: boolean; prices?: Record<string, number>; routeName?: string }> {
  if (!pickup || !dropoff) return { found: false };
  
  // Bypass Supabase pour demo
  if (tenantId === 'demo' || tenantId.startsWith('demo')) {
    return { found: false };
  }

  try {
    const { data: routes } = await supabase
      .from('fixed_price_routes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

  for (const route of routes || []) {
    // Vérifier sens normal
    const originMatch = calculateDistance(
      pickup.lat, pickup.lng,
      route.origin_lat, route.origin_lng
    ) <= route.origin_radius_km;
    
    const destMatch = calculateDistance(
      dropoff.lat, dropoff.lng,
      route.destination_lat, route.destination_lng
    ) <= route.destination_radius_km;

    if (originMatch && destMatch) {
      return { found: true, prices: route.prices, routeName: route.name };
    }

    // Vérifier sens inverse si bidirectionnel
    if (route.bidirectional) {
      const reverseOrigin = calculateDistance(
        pickup.lat, pickup.lng,
        route.destination_lat, route.destination_lng
      ) <= route.destination_radius_km;
      
      const reverseDest = calculateDistance(
        dropoff.lat, dropoff.lng,
        route.origin_lat, route.origin_lng
      ) <= route.origin_radius_km;

      if (reverseOrigin && reverseDest) {
        return { found: true, prices: route.prices, routeName: `${route.name} (retour)` };
      }
    }
  }

  return { found: false };
  } catch (error) {
    console.error('Error checking fixed price route:', error);
    return { found: false };
  }
}

/**
 * Calcule le prix pour un véhicule selon l'algorithme VeeoStras
 * Formule: (base_fare + distance×per_km + duration×per_min + stops×stop_fee) × surge
 */
function calculateVehiclePrice(
  params: z.infer<typeof calculatePriceSchema> & { stops?: number },
  tariff: VehicleTariff,
  surge: { multiplier: number; reasons: string[]; breakdown: { peakHour: number; weekend: number; night: number } },
  zoneSurcharge: number = 0
): {
  vehicleType: string;
  displayOrder: number;
  name: string;
  description: string;
  price: number;
  driverPayout: number;
  commission: number;
  surgeMultiplier: number;
  surgeReasons: string[];
  surgeBreakdown: { peakHour: number; weekend: number; night: number };
  isFixedPrice: boolean;
  distance: number;
  duration: number;
  additionalStopCount: number;
  maxPassengers: number;
  maxLuggage: number;
  features: string[];
  breakdown: {
    baseFare: number;
    distanceCost: number;
    durationCost: number;
    stopsCost: number;
    zoneSurcharge: number;
    subtotal: number;
    minimum: number;
    baseAmount: number;
    surgeAmount: number;
    total: number;
  };
} {
  const stopsCount = params.stops || 0;
  
  // Calcul de base selon formule VeeoStras
  const baseFare = tariff.baseFare;
  const distanceCost = params.distanceKm * tariff.perKm;
  const durationCost = params.durationMin * tariff.perMin;
  const stopsCost = stopsCount * tariff.additionalStopFee;
  const subtotal = baseFare + distanceCost + durationCost + stopsCost + zoneSurcharge;
  
  // Appliquer le minimum
  const baseAmount = Math.max(subtotal, tariff.minimum);
  
  // Appliquer le surge
  const priceBeforeSurge = baseAmount;
  const priceAfterSurge = baseAmount * surge.multiplier;
  const surgeAmount = priceAfterSurge - priceBeforeSurge;
  const price = Math.round(priceAfterSurge * 100) / 100;
  
  // Calcul commission et payout
  const commission = Math.round(price * tariff.commission * 100) / 100;
  const driverPayout = Math.round((price - commission) * 100) / 100;

  return {
    vehicleType: tariff.vehicleType,
    displayOrder: tariff.displayOrder,
    name: tariff.name,
    description: tariff.description,
    price,
    driverPayout,
    commission,
    surgeMultiplier: surge.multiplier,
    surgeReasons: surge.reasons,
    surgeBreakdown: surge.breakdown,
    isFixedPrice: false,
    distance: params.distanceKm,
    duration: params.durationMin,
    additionalStopCount: stopsCount,
    maxPassengers: tariff.maxPassengers,
    maxLuggage: tariff.maxLuggage,
    features: tariff.features,
    breakdown: {
      baseFare: Math.round(baseFare * 100) / 100,
      distanceCost: Math.round(distanceCost * 100) / 100,
      durationCost: Math.round(durationCost * 100) / 100,
      stopsCost: Math.round(stopsCost * 100) / 100,
      zoneSurcharge: Math.round(zoneSurcharge * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      minimum: tariff.minimum,
      baseAmount: Math.round(baseAmount * 100) / 100,
      surgeAmount: Math.round(surgeAmount * 100) / 100,
      total: price
    }
  };
}

/**
 * POST /api/v1/pricing/calculate
 * Calcule le prix pour tous les véhicules - Compatible VeeoStras
 */
router.post('/calculate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const params = calculatePriceSchema.parse(req.body);
    const tenantId = req.tenant!.id;
    
    // Nombre d'arrêts intermédiaires
    const stopsCount = params.stops?.length || 0;
    
    // Charger config tenant (optionnel)
    const tenantConfig = await loadTenantPricingConfig(tenantId);
    const tariffs: VehicleTariff[] = tenantConfig?.tariffs || DEFAULT_TARIFFS;
    
    // Vérifier routes à prix fixe
    const fixedRoute = await checkFixedPriceRoute(tenantId, params.pickup, params.dropoff);
    
    // Multiplicateurs trafic et météo (comme VeeoStras)
    const trafficMultiplier = {
      low: 0.95,
      normal: 1.0,
      high: 1.10,
      severe: 1.25
    }[params.trafficLevel] || 1.0;
    
    const weatherMultiplier = {
      clear: 1.0,
      rain: 1.05,
      snow: 1.15,
      storm: 1.20
    }[params.weather] || 1.0;
    
    // Calculer pour chaque véhicule avec son propre surge
    const quotes = tariffs
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((tariff: VehicleTariff) => {
        // Calculer le surge spécifique à ce véhicule
        const surge = calculateSurgeFactors(params.bookingTime, tariff);
        
        if (fixedRoute.found && fixedRoute.prices?.[tariff.vehicleType]) {
          // Prix fixe trouvé - pas de surge/trafic/météo
          const fixedPrice = fixedRoute.prices[tariff.vehicleType];
          const commission = Math.round(fixedPrice * tariff.commission * 100) / 100;
          
          return {
            vehicleType: tariff.vehicleType,
            displayOrder: tariff.displayOrder,
            name: tariff.name,
            description: tariff.description,
            price: fixedPrice,
            driverPayout: Math.round((fixedPrice - commission) * 100) / 100,
            commission,
            surgeMultiplier: 1,
            surgeReasons: [],
            surgeBreakdown: { peakHour: 1, weekend: 1, night: 1 },
            isFixedPrice: true,
            fixedRouteName: fixedRoute.routeName,
            distance: params.distanceKm,
            duration: params.durationMin,
            additionalStopCount: 0,
            maxPassengers: tariff.maxPassengers,
            maxLuggage: tariff.maxLuggage,
            features: tariff.features,
            breakdown: null
          };
        }
        
        // Calcul dynamique avec arrêts
        const quote = calculateVehiclePrice(
          { ...params, stops: stopsCount } as any, 
          tariff, 
          surge, 
          0
        );
        
        // Appliquer trafic et météo
        if (trafficMultiplier !== 1.0 || weatherMultiplier !== 1.0) {
          const adjustedPrice = Math.round(quote.price * trafficMultiplier * weatherMultiplier * 100) / 100;
          const adjustedCommission = Math.round(adjustedPrice * tariff.commission * 100) / 100;
          
          return {
            ...quote,
            price: adjustedPrice,
            commission: adjustedCommission,
            driverPayout: Math.round((adjustedPrice - adjustedCommission) * 100) / 100,
            trafficMultiplier,
            weatherMultiplier
          };
        }
        
        return quote;
      });

    // Métriques
    metrics.recordPricingCalculation(Date.now() - startTime);

    res.json({
      success: true,
      data: {
        quotes,
        parameters: {
          distanceKm: params.distanceKm,
          durationMin: params.durationMin,
          bookingTime: params.bookingTime || new Date().toISOString(),
          passengers: params.passengers,
          luggage: params.luggage,
          stopsCount,
          trafficLevel: params.trafficLevel,
          weather: params.weather,
          pickup: params.pickup,
          dropoff: params.dropoff
        },
        calculatedAt: new Date().toISOString(),
        validFor: 300, // 5 minutes
        isFixedPriceRoute: fixedRoute.found,
        source: 'veeocore_v2'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/pricing/quote
 * Calcule le prix pour un véhicule spécifique
 */
router.post('/quote', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const params = calculatePriceSchema.parse(req.body);
    
    if (!params.vehicleType) {
      return res.status(400).json({
        error: 'MISSING_VEHICLE_TYPE',
        message: 'vehicleType is required for single quote'
      });
    }

    const tenantId = req.tenant!.id;
    
    // Charger config tenant
    const tenantConfig = await loadTenantPricingConfig(tenantId);
    const tariffs = tenantConfig?.tariffs || DEFAULT_TARIFFS;
    
    const tariff = tariffs.find((t: VehicleTariff) => t.vehicleType === params.vehicleType);
    if (!tariff) {
      return res.status(400).json({
        error: 'INVALID_VEHICLE_TYPE',
        message: `Vehicle type "${params.vehicleType}" not found`,
        availableTypes: tariffs.map((t: VehicleTariff) => t.vehicleType)
      });
    }

    // Vérifier routes à prix fixe
    const fixedRoute = await checkFixedPriceRoute(tenantId, params.pickup, params.dropoff);
    const stopsCount = params.stops?.length || 0;
    
    let quote;
    
    if (fixedRoute.found && fixedRoute.prices?.[params.vehicleType]) {
      const fixedPrice = fixedRoute.prices[params.vehicleType];
      const commission = Math.round(fixedPrice * tariff.commission * 100) / 100;
      
      quote = {
        vehicleType: tariff.vehicleType,
        displayOrder: tariff.displayOrder,
        name: tariff.name,
        description: tariff.description,
        price: fixedPrice,
        driverPayout: Math.round((fixedPrice - commission) * 100) / 100,
        commission,
        surgeMultiplier: 1,
        surgeReasons: [],
        surgeBreakdown: { peakHour: 1, weekend: 1, night: 1 },
        isFixedPrice: true,
        fixedRouteName: fixedRoute.routeName,
        distance: params.distanceKm,
        duration: params.durationMin,
        additionalStopCount: 0,
        maxPassengers: tariff.maxPassengers,
        maxLuggage: tariff.maxLuggage,
        features: tariff.features
      };
    } else {
      const surge = calculateSurgeFactors(params.bookingTime, tariff);
      quote = calculateVehiclePrice({ ...params, stops: stopsCount } as any, tariff, surge, 0);
    }

    metrics.recordPricingCalculation(Date.now() - startTime);

    res.json({
      success: true,
      data: {
        quote,
        calculatedAt: new Date().toISOString(),
        validFor: 300
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * GET /api/v1/pricing/vehicles
 * Liste les véhicules disponibles et leurs tarifs complets
 */
router.get('/vehicles', async (req: Request, res: Response) => {
  const tenantConfig = await loadTenantPricingConfig(req.tenant!.id);
  const tariffs: VehicleTariff[] = tenantConfig?.tariffs || DEFAULT_TARIFFS;

  const vehicles = tariffs
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((t: VehicleTariff) => ({
      type: t.vehicleType,
      displayOrder: t.displayOrder,
      name: t.name,
      description: t.description,
      maxPassengers: t.maxPassengers,
      maxLuggage: t.maxLuggage,
      features: t.features,
      pricing: {
        baseFare: t.baseFare,
        perKm: t.perKm,
        perMin: t.perMin,
        minimumFare: t.minimum,
        additionalStopFee: t.additionalStopFee,
        commission: t.commission
      },
      multipliers: {
        peakHour: t.peakHourMultiplier,
        weekend: t.weekendMultiplier,
        night: t.nightMultiplier
      },
      icon: getVehicleIcon(t.vehicleType)
    }));

  res.json({
    success: true,
    data: { vehicles }
  });
});

/**
 * GET /api/v1/pricing/surge
 * Récupère les facteurs surge actuels (utilise le véhicule standard comme référence)
 */
router.get('/surge', async (req: Request, res: Response) => {
  const bookingTime = req.query.bookingTime as string | undefined;
  
  // Utilise le tarif standard comme référence pour le surge
  const standardTariff = DEFAULT_TARIFFS.find(t => t.vehicleType === 'veeo_x') || DEFAULT_TARIFFS[0];
  const surge = calculateSurgeFactors(bookingTime, standardTariff);
  
  const now = bookingTime ? new Date(bookingTime) : new Date();
  const hour = now.getHours();
  const day = now.getDay();

  res.json({
    success: true,
    data: {
      currentMultiplier: surge.multiplier,
      reasons: surge.reasons,
      breakdown: surge.breakdown,
      factors: {
        isPeakHour: (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19),
        isWeekend: day === 5 || day === 6,
        isNight: hour >= 22 || hour < 6
      },
      timestamp: now.toISOString()
    }
  });
});

/**
 * GET /api/v1/pricing/config
 * Récupère la configuration de tarification du tenant
 */
router.get('/config', async (req: Request, res: Response) => {
  const config = await loadTenantPricingConfig(req.tenant!.id);
  
  res.json({
    success: true,
    data: {
      tariffs: config?.tariffs || DEFAULT_TARIFFS,
      surgeEnabled: config?.surge_enabled ?? true,
      maxSurgeMultiplier: config?.max_surge_multiplier ?? 1.5,
      currency: config?.currency || 'EUR'
    }
  });
});

/**
 * PUT /api/v1/pricing/config
 * Met à jour la configuration de tarification (plans pro+)
 */
router.put('/config', async (req: Request, res: Response) => {
  const configSchema = z.object({
    tariffs: z.array(z.object({
      vehicleType: z.string(),
      name: z.string(),
      baseFare: z.number().min(0),
      perKm: z.number().min(0),
      perMin: z.number().min(0),
      minimum: z.number().min(0),
      commission: z.number().min(0).max(1),
      maxPassengers: z.number().int().positive(),
      maxLuggage: z.number().int().min(0)
    })).optional(),
    surgeEnabled: z.boolean().optional(),
    maxSurgeMultiplier: z.number().min(1).max(3).optional(),
    currency: z.string().length(3).optional()
  });

  try {
    const updates = configSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from('pricing_config')
      .upsert({
        tenant_id: req.tenant!.id,
        tariffs: updates.tariffs,
        surge_enabled: updates.surgeEnabled,
        max_surge_multiplier: updates.maxSurgeMultiplier,
        currency: updates.currency,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
    }

    res.json({
      success: true,
      data: { config: data }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    throw error;
  }
});

// Helper functions
function getVehicleDescription(type: string): string {
  const descriptions: Record<string, string> = {
    standard: 'Berline confortable pour 1-4 passagers',
    premium: 'Véhicule haut de gamme avec service premium',
    van: 'Minivan pour groupes jusqu\'à 8 personnes'
  };
  return descriptions[type] || 'Véhicule VTC';
}

function getVehicleIcon(type: string): string {
  const icons: Record<string, string> = {
    standard: '🚗',
    premium: '🚘',
    van: '🚐'
  };
  return icons[type] || '🚙';
}

export default router;
