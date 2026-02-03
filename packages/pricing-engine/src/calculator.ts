/**
 * Calculateur de prix principal
 * Logique extraite et adaptée de VeeoStras
 */

import type {
  PriceCalculationParams,
  PriceResult,
  PricingEngineConfig,
  VehicleTariff
} from './types';
import { calculateSurgeWithCap, getSurgeFactors } from './surge';
import { calculateZoneFees, findZone } from './zones';
import { calculateFixedPrice } from './fixed-routes';

/**
 * Calcule le prix pour un véhicule donné
 */
export function calculatePrice(
  params: PriceCalculationParams,
  config: PricingEngineConfig
): PriceResult {
  // Trouver le tarif du véhicule
  const tariff = config.defaultTariffs.find(t => t.vehicleType === params.vehicleType);
  
  if (!tariff) {
    throw new Error(`Vehicle type "${params.vehicleType}" not found in tariff configuration`);
  }
  
  // Vérifier les zones de départ et d'arrivée
  const pickupZone = params.pickupLat !== undefined && params.pickupLng !== undefined
    ? findZone(params.pickupLat, params.pickupLng, config.zones)
    : null;
  
  const dropoffZone = params.dropoffLat !== undefined && params.dropoffLng !== undefined
    ? findZone(params.dropoffLat, params.dropoffLng, config.zones)
    : null;
  
  // Vérifier si un prix fixe existe pour cette route
  const fixedPriceResult = calculateFixedPrice(
    pickupZone?.zoneName || null,
    dropoffZone?.zoneName || null,
    params.vehicleType,
    config.fixedRoutes
  );
  
  if (fixedPriceResult.isFixed) {
    return {
      vehicleType: params.vehicleType,
      price: fixedPriceResult.price,
      driverPayout: fixedPriceResult.driverPayout,
      commission: fixedPriceResult.commission,
      distanceKm: params.distanceKm,
      durationMin: params.durationMin,
      surgeMultiplier: 1.0,
      additionalStopCount: 0,
      zoneFees: 0,
      isFixedPrice: true,
      source: 'fixed_route',
      breakdown: {
        baseFare: fixedPriceResult.price,
        distanceCost: 0,
        durationCost: 0,
        stopsFee: 0,
        surgeAmount: 0,
        zoneFees: 0
      }
    };
  }
  
  // Calcul dynamique du prix
  return calculateDynamicPrice(params, config, tariff, pickupZone, dropoffZone);
}

/**
 * Calcule le prix dynamique (non fixe)
 */
function calculateDynamicPrice(
  params: PriceCalculationParams,
  config: PricingEngineConfig,
  tariff: VehicleTariff,
  pickupZone: ReturnType<typeof findZone>,
  dropoffZone: ReturnType<typeof findZone>
): PriceResult {
  
  // Calcul distance et durée (priorité aux segments si disponibles)
  let totalDistance = 0;
  let totalDuration = 0;
  let stopCount = 0;
  
  if (params.routeSegments && params.routeSegments.length > 0) {
    for (const segment of params.routeSegments) {
      totalDistance += segment.distanceKm || 0;
      totalDuration += segment.durationMin || 0;
    }
    stopCount = Math.max(params.routeSegments.length - 1, 0);
  } else {
    totalDistance = params.distanceKm;
    totalDuration = params.durationMin;
  }
  
  // Calcul du montant de base
  const baseFare = tariff.baseFare;
  const distanceCost = totalDistance * tariff.perKm;
  const durationCost = totalDuration * tariff.perMinute;
  const stopsFee = stopCount * tariff.additionalStopFee;
  
  let baseAmount = baseFare + distanceCost + durationCost + stopsFee;
  
  // Application du tarif minimum
  baseAmount = Math.max(baseAmount, tariff.minimumFare);
  
  // Calcul du surge multiplier
  let surgeMultiplier = 1.0;
  let surgeAmount = 0;
  
  if (params.bookingTime) {
    surgeMultiplier = calculateSurgeWithCap({
      bookingTime: params.bookingTime,
      config,
      vehicleTariff: {
        peakHourMultiplier: tariff.peakHourMultiplier,
        weekendMultiplier: tariff.weekendMultiplier,
        nightMultiplier: tariff.nightMultiplier
      }
    });
    
    surgeAmount = baseAmount * (surgeMultiplier - 1);
  }
  
  // Calcul des frais de zone
  const zoneFeesResult = calculateZoneFees(
    params.pickupLat,
    params.pickupLng,
    params.dropoffLat,
    params.dropoffLng,
    config.zones
  );
  
  // Prix final
  const priceBeforeZones = round(baseAmount * surgeMultiplier, 2);
  const price = round(priceBeforeZones + zoneFeesResult.totalFees, 2);
  
  // S'assurer du prix minimum
  const finalPrice = Math.max(price, config.minPrice);
  
  // Commission et payout
  const commission = round(finalPrice * tariff.commissionRate, 2);
  const driverPayout = round(finalPrice - commission, 2);
  
  return {
    vehicleType: params.vehicleType,
    price: finalPrice,
    driverPayout,
    commission,
    distanceKm: round(totalDistance, 3),
    durationMin: round(totalDuration, 2),
    surgeMultiplier: round(surgeMultiplier, 3),
    additionalStopCount: stopCount,
    zoneFees: zoneFeesResult.totalFees,
    isFixedPrice: false,
    source: 'calculated',
    breakdown: {
      baseFare: round(baseFare, 2),
      distanceCost: round(distanceCost, 2),
      durationCost: round(durationCost, 2),
      stopsFee: round(stopsFee, 2),
      surgeAmount: round(surgeAmount, 2),
      zoneFees: round(zoneFeesResult.totalFees, 2)
    }
  };
}

/**
 * Calcule les prix pour tous les types de véhicules
 */
export function calculateAllVehiclePrices(
  params: Omit<PriceCalculationParams, 'vehicleType'>,
  config: PricingEngineConfig
): PriceResult[] {
  return config.defaultTariffs
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(tariff => calculatePrice(
      { ...params, vehicleType: tariff.vehicleType },
      config
    ));
}

/**
 * Estimation rapide sans zones ni routes fixes
 */
export function quickEstimate(
  distanceKm: number,
  durationMin: number,
  vehicleType: string,
  config: PricingEngineConfig
): number {
  const tariff = config.defaultTariffs.find(t => t.vehicleType === vehicleType);
  if (!tariff) return 0;
  
  const baseAmount = tariff.baseFare + (distanceKm * tariff.perKm) + (durationMin * tariff.perMinute);
  return Math.max(round(baseAmount, 2), tariff.minimumFare);
}

// Utility
function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
