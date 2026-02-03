/**
 * @veeo/pricing-engine
 * Moteur de calcul des prix pour VTC/Taxi
 * 
 * Extrait et adapté du système VeeoStras
 */

// Types
export * from './types';

// Core
export { PricingEngine } from './engine';
export { calculatePrice, calculateAllVehiclePrices } from './calculator';

// Configuration
export { defaultConfig, createConfig } from './config';

// Utilities
export { calculateSurge, applySurgeCap } from './surge';
export { calculateZoneFees, isInZone } from './zones';
export { calculateFixedPrice, hasFixedRoute } from './fixed-routes';
