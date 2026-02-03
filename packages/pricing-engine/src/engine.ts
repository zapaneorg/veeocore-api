/**
 * PricingEngine - Classe principale du moteur de tarification
 * API orientée objet pour une utilisation simplifiée
 */

import type {
  PriceCalculationParams,
  PriceResult,
  PricingEngineConfig,
  VehicleTariff,
  PricingZone,
  FixedPriceRoute,
  Tenant
} from './types';
import { defaultConfig, createConfig } from './config';
import { calculatePrice, calculateAllVehiclePrices, quickEstimate } from './calculator';
import { getSurgeFactors } from './surge';
import { findZone } from './zones';

export class PricingEngine {
  private config: PricingEngineConfig;
  private tenant?: Tenant;

  constructor(config?: Partial<PricingEngineConfig>) {
    this.config = config ? createConfig(config) : defaultConfig;
  }

  /**
   * Configure le moteur pour un tenant spécifique
   */
  setTenant(tenant: Tenant): void {
    this.tenant = tenant;
    if (tenant.config) {
      this.config = createConfig({ ...this.config, ...tenant.config });
    }
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<PricingEngineConfig>): void {
    this.config = createConfig({ ...this.config, ...updates });
  }

  /**
   * Calcule le prix pour un trajet
   */
  calculatePrice(params: PriceCalculationParams): PriceResult {
    return calculatePrice(params, this.config);
  }

  /**
   * Calcule les prix pour tous les véhicules
   */
  calculateAllPrices(params: Omit<PriceCalculationParams, 'vehicleType'>): PriceResult[] {
    return calculateAllVehiclePrices(params, this.config);
  }

  /**
   * Estimation rapide (sans zones)
   */
  quickEstimate(distanceKm: number, durationMin: number, vehicleType: string): number {
    return quickEstimate(distanceKm, durationMin, vehicleType, this.config);
  }

  /**
   * Récupère les facteurs surge pour une date/heure
   */
  getSurgeFactors(bookingTime: Date) {
    return getSurgeFactors(bookingTime, this.config);
  }

  /**
   * Trouve la zone pour des coordonnées
   */
  findZone(lat: number, lng: number): PricingZone | null {
    return findZone(lat, lng, this.config.zones);
  }

  // ============== Gestion des tarifs ==============

  /**
   * Récupère tous les tarifs véhicules
   */
  getTariffs(): VehicleTariff[] {
    return [...this.config.defaultTariffs];
  }

  /**
   * Récupère un tarif par type de véhicule
   */
  getTariff(vehicleType: string): VehicleTariff | undefined {
    return this.config.defaultTariffs.find(t => t.vehicleType === vehicleType);
  }

  /**
   * Met à jour un tarif
   */
  updateTariff(vehicleType: string, updates: Partial<VehicleTariff>): void {
    const index = this.config.defaultTariffs.findIndex(t => t.vehicleType === vehicleType);
    if (index !== -1) {
      this.config.defaultTariffs[index] = {
        ...this.config.defaultTariffs[index],
        ...updates
      };
    }
  }

  /**
   * Ajoute un nouveau tarif véhicule
   */
  addTariff(tariff: VehicleTariff): void {
    const exists = this.config.defaultTariffs.some(t => t.vehicleType === tariff.vehicleType);
    if (!exists) {
      this.config.defaultTariffs.push(tariff);
    }
  }

  /**
   * Supprime un tarif
   */
  removeTariff(vehicleType: string): void {
    this.config.defaultTariffs = this.config.defaultTariffs.filter(
      t => t.vehicleType !== vehicleType
    );
  }

  // ============== Gestion des zones ==============

  /**
   * Récupère toutes les zones
   */
  getZones(): PricingZone[] {
    return [...this.config.zones];
  }

  /**
   * Ajoute une zone
   */
  addZone(zone: PricingZone): void {
    const exists = this.config.zones.some(z => z.id === zone.id);
    if (!exists) {
      this.config.zones.push(zone);
    }
  }

  /**
   * Met à jour une zone
   */
  updateZone(zoneId: string, updates: Partial<PricingZone>): void {
    const index = this.config.zones.findIndex(z => z.id === zoneId);
    if (index !== -1) {
      this.config.zones[index] = { ...this.config.zones[index], ...updates };
    }
  }

  /**
   * Supprime une zone
   */
  removeZone(zoneId: string): void {
    this.config.zones = this.config.zones.filter(z => z.id !== zoneId);
  }

  // ============== Gestion des routes fixes ==============

  /**
   * Récupère toutes les routes fixes
   */
  getFixedRoutes(): FixedPriceRoute[] {
    return [...this.config.fixedRoutes];
  }

  /**
   * Ajoute une route fixe
   */
  addFixedRoute(route: FixedPriceRoute): void {
    const exists = this.config.fixedRoutes.some(r => r.id === route.id);
    if (!exists) {
      this.config.fixedRoutes.push(route);
    }
  }

  /**
   * Met à jour une route fixe
   */
  updateFixedRoute(routeId: string, updates: Partial<FixedPriceRoute>): void {
    const index = this.config.fixedRoutes.findIndex(r => r.id === routeId);
    if (index !== -1) {
      this.config.fixedRoutes[index] = { ...this.config.fixedRoutes[index], ...updates };
    }
  }

  /**
   * Supprime une route fixe
   */
  removeFixedRoute(routeId: string): void {
    this.config.fixedRoutes = this.config.fixedRoutes.filter(r => r.id !== routeId);
  }

  // ============== Export/Import configuration ==============

  /**
   * Exporte la configuration actuelle
   */
  exportConfig(): PricingEngineConfig {
    return { ...this.config };
  }

  /**
   * Importe une configuration
   */
  importConfig(config: PricingEngineConfig): void {
    this.config = createConfig(config);
  }

  /**
   * Réinitialise à la configuration par défaut
   */
  reset(): void {
    this.config = defaultConfig;
    this.tenant = undefined;
  }
}
