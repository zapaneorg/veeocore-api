/**
 * Calcul du surge multiplier
 * Basé sur le système VeeoStras
 */

import type { PricingEngineConfig } from './types';

interface SurgeParams {
  bookingTime: Date;
  config: PricingEngineConfig;
  vehicleTariff: {
    peakHourMultiplier: number;
    weekendMultiplier: number;
    nightMultiplier: number;
  };
}

/**
 * Calcule le multiplicateur surge basé sur l'heure de réservation
 */
export function calculateSurge({
  bookingTime,
  config,
  vehicleTariff
}: SurgeParams): number {
  let surge = 1.0;
  
  // Convertir en timezone locale
  const localTime = new Date(bookingTime.toLocaleString('en-US', { 
    timeZone: config.timezone 
  }));
  
  const hour = localTime.getHours();
  const dayOfWeek = localTime.getDay(); // 0=dimanche, 6=samedi
  
  // Heures de pointe (matin)
  if (hour >= config.peakHours.morning.start && hour < config.peakHours.morning.end) {
    surge *= vehicleTariff.peakHourMultiplier;
  }
  
  // Heures de pointe (soir)
  if (hour >= config.peakHours.evening.start && hour < config.peakHours.evening.end) {
    surge *= vehicleTariff.peakHourMultiplier;
  }
  
  // Weekend
  if (config.weekendDays.includes(dayOfWeek)) {
    surge *= vehicleTariff.weekendMultiplier;
  }
  
  // Nuit (gestion du passage de minuit)
  const { start: nightStart, end: nightEnd } = config.nightHours;
  if (nightStart > nightEnd) {
    // Ex: 22h-6h (passe minuit)
    if (hour >= nightStart || hour < nightEnd) {
      surge *= vehicleTariff.nightMultiplier;
    }
  } else {
    // Cas simple: heures continues
    if (hour >= nightStart && hour < nightEnd) {
      surge *= vehicleTariff.nightMultiplier;
    }
  }
  
  // Garantir minimum 1
  surge = Math.max(surge, 1.0);
  
  return surge;
}

/**
 * Applique le plafond au surge
 */
export function applySurgeCap(surge: number, maxSurge: number): number {
  return Math.min(surge, maxSurge);
}

/**
 * Calcule le surge avec plafond
 */
export function calculateSurgeWithCap(params: SurgeParams): number {
  const surge = calculateSurge(params);
  return applySurgeCap(surge, params.config.maxSurgeMultiplier);
}

/**
 * Détermine les facteurs surge actifs
 */
export function getSurgeFactors(
  bookingTime: Date,
  config: PricingEngineConfig
): {
  isPeakHour: boolean;
  isWeekend: boolean;
  isNight: boolean;
  factors: string[];
} {
  const localTime = new Date(bookingTime.toLocaleString('en-US', { 
    timeZone: config.timezone 
  }));
  
  const hour = localTime.getHours();
  const dayOfWeek = localTime.getDay();
  
  const isPeakHour = 
    (hour >= config.peakHours.morning.start && hour < config.peakHours.morning.end) ||
    (hour >= config.peakHours.evening.start && hour < config.peakHours.evening.end);
  
  const isWeekend = config.weekendDays.includes(dayOfWeek);
  
  const { start: nightStart, end: nightEnd } = config.nightHours;
  const isNight = nightStart > nightEnd
    ? (hour >= nightStart || hour < nightEnd)
    : (hour >= nightStart && hour < nightEnd);
  
  const factors: string[] = [];
  if (isPeakHour) factors.push('peak_hour');
  if (isWeekend) factors.push('weekend');
  if (isNight) factors.push('night');
  
  return { isPeakHour, isWeekend, isNight, factors };
}
