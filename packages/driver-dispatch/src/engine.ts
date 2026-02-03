/**
 * DispatchEngine - Moteur principal de dispatch
 */

import type {
  Driver,
  RideRequest,
  RideRequestStatus,
  DispatchConfig,
  DispatchEvent,
  DispatchCallback,
  DispatchStats
} from './types';
import { DriverManager } from './driver-manager';
import { NotificationService } from './notifications';
import { AutoAssignment } from './assignment';
import { findNearestDrivers } from './geo';

const defaultConfig: DispatchConfig = {
  searchRadiusKm: 5,
  maxSearchRadiusKm: 15,
  searchRadiusIncrement: 2,
  maxSearchAttempts: 3,
  driverResponseTimeout: 30,
  maxWaitingTime: 120,
  assignmentStrategy: 'nearest',
  maxDriversToNotify: 5,
  enablePush: true,
  enableSMS: false,
  enableEmail: false,
  enableWebhook: false,
  autoAcceptEnabled: false,
  autoAcceptDelay: 10
};

export class DispatchEngine {
  private config: DispatchConfig;
  private driverManager: DriverManager;
  private notificationService: NotificationService;
  private pendingRequests: Map<string, RideRequest> = new Map();
  private eventCallbacks: DispatchCallback[] = [];
  private stats: DispatchStats = {
    totalRequests: 0,
    successfulAssignments: 0,
    failedAssignments: 0,
    averageResponseTime: 0,
    averageSearchTime: 0,
    acceptanceRate: 0
  };

  constructor(config?: Partial<DispatchConfig>) {
    this.config = { ...defaultConfig, ...config };
    this.driverManager = new DriverManager();
    this.notificationService = new NotificationService();
  }

  /**
   * Configure le moteur
   */
  setConfig(config: Partial<DispatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Récupère le gestionnaire de chauffeurs
   */
  getDriverManager(): DriverManager {
    return this.driverManager;
  }

  /**
   * Récupère le service de notifications
   */
  getNotificationService(): NotificationService {
    return this.notificationService;
  }

  /**
   * Soumet une nouvelle demande de course
   */
  async submitRideRequest(request: RideRequest): Promise<{
    success: boolean;
    requestId: string;
    assignedDriver?: Driver;
    estimatedArrival?: number;
    error?: string;
  }> {
    this.stats.totalRequests++;
    const startTime = Date.now();

    this.pendingRequests.set(request.id, request);
    this.emitEvent({ type: 'search_started', rideRequestId: request.id, timestamp: new Date() });

    // Recherche de chauffeurs avec expansion progressive
    let currentRadius = this.config.searchRadiusKm;
    let attempts = 0;

    while (attempts < this.config.maxSearchAttempts) {
      attempts++;

      // Trouver les chauffeurs disponibles
      const availableDrivers = this.driverManager.getAvailableDrivers();
      
      // Utiliser la stratégie d'assignation
      const assignment = new AutoAssignment({ ...this.config, searchRadiusKm: currentRadius });
      const result = await assignment.findDriver(request, availableDrivers);

      if (result.success && result.driver) {
        // Notifier le chauffeur
        await this.notifyDriver(result.driver, request);
        
        this.emitEvent({
          type: 'driver_notified',
          rideRequestId: request.id,
          driverId: result.driver.id,
          timestamp: new Date()
        });

        // Auto-accept ou attendre réponse
        if (this.config.autoAcceptEnabled) {
          await this.sleep(this.config.autoAcceptDelay * 1000);
        }

        // Assigner le chauffeur
        request.status = 'assigned';
        request.assignedDriverId = result.driver.id;
        this.driverManager.updateStatus(result.driver.id, 'busy');

        this.emitEvent({
          type: 'driver_assigned',
          rideRequestId: request.id,
          driverId: result.driver.id,
          timestamp: new Date()
        });

        const searchTime = Date.now() - startTime;
        this.updateStats(true, searchTime);

        return {
          success: true,
          requestId: request.id,
          assignedDriver: result.driver,
          estimatedArrival: result.estimatedArrival
        };
      }

      // Élargir le rayon de recherche
      currentRadius = Math.min(
        currentRadius + this.config.searchRadiusIncrement,
        this.config.maxSearchRadiusKm
      );

      this.emitEvent({
        type: 'search_expanded',
        rideRequestId: request.id,
        timestamp: new Date(),
        data: { newRadius: currentRadius }
      });
    }

    // Échec de l'assignation
    request.status = 'no_driver';
    this.emitEvent({
      type: 'search_failed',
      rideRequestId: request.id,
      timestamp: new Date()
    });

    const searchTime = Date.now() - startTime;
    this.updateStats(false, searchTime);

    return {
      success: false,
      requestId: request.id,
      error: 'No available drivers found'
    };
  }

  /**
   * Chauffeur accepte une course
   */
  async acceptRide(driverId: string, requestId: string): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    const driver = this.driverManager.getDriver(driverId);

    if (!request || !driver) return false;
    if (request.assignedDriverId !== driverId) return false;

    request.status = 'driver_accepted';
    this.driverManager.updateStatus(driverId, 'going_pickup');

    this.emitEvent({
      type: 'driver_responded',
      rideRequestId: requestId,
      driverId,
      timestamp: new Date(),
      data: { response: 'accepted' }
    });

    // Notifier le client
    await this.notificationService.notifyDriverEnRoute(
      request.customerId,
      driver,
      10 // estimation
    );

    return true;
  }

  /**
   * Chauffeur refuse une course
   */
  async declineRide(driverId: string, requestId: string): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);

    if (!request) return false;
    if (request.assignedDriverId !== driverId) return false;

    request.status = 'driver_declined';
    request.assignedDriverId = undefined;
    this.driverManager.updateStatus(driverId, 'available');

    this.emitEvent({
      type: 'driver_responded',
      rideRequestId: requestId,
      driverId,
      timestamp: new Date(),
      data: { response: 'declined' }
    });

    // Relancer la recherche
    // TODO: exclure ce chauffeur et recommencer

    return true;
  }

  /**
   * Annule une course
   */
  async cancelRide(
    requestId: string, 
    cancelledBy: 'customer' | 'driver' | 'system',
    reason?: string
  ): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    request.status = 'cancelled';

    if (request.assignedDriverId) {
      this.driverManager.updateStatus(request.assignedDriverId, 'available');
      
      // Notifier le chauffeur
      await this.notificationService.notifyRideCancelled(
        request.assignedDriverId,
        'driver',
        reason
      );
    }

    // Notifier le client
    if (cancelledBy !== 'customer') {
      await this.notificationService.notifyRideCancelled(
        request.customerId,
        'customer',
        reason
      );
    }

    this.pendingRequests.delete(requestId);
    return true;
  }

  /**
   * Met à jour le statut d'une course
   */
  updateRideStatus(requestId: string, status: RideRequestStatus): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    request.status = status;

    // Si terminée, libérer le chauffeur
    if (status === 'completed' && request.assignedDriverId) {
      this.driverManager.updateStatus(request.assignedDriverId, 'available');
      this.pendingRequests.delete(requestId);
    }

    return true;
  }

  /**
   * Abonne aux événements de dispatch
   */
  onEvent(callback: DispatchCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Récupère les statistiques
   */
  getStats(): DispatchStats {
    return { ...this.stats };
  }

  /**
   * Récupère les demandes en cours
   */
  getPendingRequests(): RideRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  // ========== Private Methods ==========

  private async notifyDriver(driver: Driver, request: RideRequest): Promise<void> {
    if (this.config.enablePush) {
      await this.notificationService.notifyNewRide(driver, request);
    }
  }

  private emitEvent(event: DispatchEvent): void {
    this.eventCallbacks.forEach(cb => cb(event));
  }

  private updateStats(success: boolean, searchTime: number): void {
    if (success) {
      this.stats.successfulAssignments++;
    } else {
      this.stats.failedAssignments++;
    }

    // Moyenne mobile
    const total = this.stats.successfulAssignments + this.stats.failedAssignments;
    this.stats.averageSearchTime = 
      (this.stats.averageSearchTime * (total - 1) + searchTime) / total;
    
    this.stats.acceptanceRate = this.stats.successfulAssignments / this.stats.totalRequests;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
