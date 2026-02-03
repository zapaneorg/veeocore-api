/**
 * Gestionnaire des chauffeurs
 */

import type { Driver, DriverStatus } from './types';

export class DriverManager {
  private drivers: Map<string, Driver> = new Map();
  private statusChangeCallbacks: Array<(driver: Driver, oldStatus: DriverStatus) => void> = [];

  /**
   * Ajoute ou met à jour un chauffeur
   */
  upsertDriver(driver: Driver): void {
    this.drivers.set(driver.id, driver);
  }

  /**
   * Récupère un chauffeur par ID
   */
  getDriver(driverId: string): Driver | undefined {
    return this.drivers.get(driverId);
  }

  /**
   * Récupère tous les chauffeurs
   */
  getAllDrivers(): Driver[] {
    return Array.from(this.drivers.values());
  }

  /**
   * Récupère les chauffeurs par statut
   */
  getDriversByStatus(status: DriverStatus): Driver[] {
    return this.getAllDrivers().filter(d => d.status === status);
  }

  /**
   * Récupère les chauffeurs disponibles
   */
  getAvailableDrivers(): Driver[] {
    return this.getDriversByStatus('available');
  }

  /**
   * Récupère les chauffeurs par type de véhicule
   */
  getDriversByVehicleType(vehicleType: string): Driver[] {
    return this.getAllDrivers().filter(d => d.vehicleType === vehicleType && d.isActive);
  }

  /**
   * Met à jour le statut d'un chauffeur
   */
  updateStatus(driverId: string, newStatus: DriverStatus): boolean {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;

    const oldStatus = driver.status;
    driver.status = newStatus;
    driver.updatedAt = new Date();
    
    // Notifier les callbacks
    this.statusChangeCallbacks.forEach(cb => cb(driver, oldStatus));
    
    return true;
  }

  /**
   * Met à jour la position d'un chauffeur
   */
  updateLocation(driverId: string, lat: number, lng: number): boolean {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;

    driver.currentLocation = {
      lat,
      lng,
      updatedAt: new Date()
    };
    driver.updatedAt = new Date();
    
    return true;
  }

  /**
   * Met à jour le token push d'un chauffeur
   */
  updatePushToken(driverId: string, fcmToken?: string, apnsToken?: string): boolean {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;

    if (fcmToken) driver.fcmToken = fcmToken;
    if (apnsToken) driver.apnsToken = apnsToken;
    driver.updatedAt = new Date();
    
    return true;
  }

  /**
   * Active/désactive un chauffeur
   */
  setActive(driverId: string, isActive: boolean): boolean {
    const driver = this.drivers.get(driverId);
    if (!driver) return false;

    driver.isActive = isActive;
    if (!isActive) {
      driver.status = 'offline';
    }
    driver.updatedAt = new Date();
    
    return true;
  }

  /**
   * Supprime un chauffeur
   */
  removeDriver(driverId: string): boolean {
    return this.drivers.delete(driverId);
  }

  /**
   * Charge les chauffeurs depuis une source externe
   */
  loadDrivers(drivers: Driver[]): void {
    for (const driver of drivers) {
      this.drivers.set(driver.id, driver);
    }
  }

  /**
   * Abonne aux changements de statut
   */
  onStatusChange(callback: (driver: Driver, oldStatus: DriverStatus) => void): void {
    this.statusChangeCallbacks.push(callback);
  }

  /**
   * Statistiques des chauffeurs
   */
  getStats(): {
    total: number;
    available: number;
    busy: number;
    offline: number;
    onBreak: number;
    byVehicleType: Record<string, number>;
  } {
    const drivers = this.getAllDrivers();
    const byVehicleType: Record<string, number> = {};
    
    for (const driver of drivers.filter(d => d.isActive)) {
      byVehicleType[driver.vehicleType] = (byVehicleType[driver.vehicleType] || 0) + 1;
    }
    
    return {
      total: drivers.length,
      available: this.getDriversByStatus('available').length,
      busy: this.getDriversByStatus('busy').length,
      offline: this.getDriversByStatus('offline').length,
      onBreak: this.getDriversByStatus('on_break').length,
      byVehicleType
    };
  }

  /**
   * Vide le gestionnaire
   */
  clear(): void {
    this.drivers.clear();
    this.statusChangeCallbacks = [];
  }
}
