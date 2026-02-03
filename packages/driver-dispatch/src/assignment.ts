/**
 * Stratégies d'assignation des chauffeurs
 */

import type { Driver, RideRequest, DispatchConfig } from './types';
import { findNearestDrivers, calculateDistance } from './geo';

/**
 * Résultat d'assignation
 */
export interface AssignmentResult {
  success: boolean;
  driver?: Driver;
  distance?: number;
  estimatedArrival?: number;
  reason?: string;
}

/**
 * Assignation automatique - sélectionne la meilleure stratégie
 */
export class AutoAssignment {
  constructor(private config: DispatchConfig) {}

  async findDriver(
    ride: RideRequest,
    availableDrivers: Driver[]
  ): Promise<AssignmentResult> {
    switch (this.config.assignmentStrategy) {
      case 'nearest':
        return new ProximityAssignment(this.config).findDriver(ride, availableDrivers);
      case 'queue':
        return new QueueAssignment(this.config).findDriver(ride, availableDrivers);
      case 'rating':
        return new RatingAssignment(this.config).findDriver(ride, availableDrivers);
      case 'balanced':
        return new BalancedAssignment(this.config).findDriver(ride, availableDrivers);
      default:
        return new ProximityAssignment(this.config).findDriver(ride, availableDrivers);
    }
  }
}

/**
 * Assignation par proximité - chauffeur le plus proche
 */
export class ProximityAssignment {
  constructor(private config: DispatchConfig) {}

  async findDriver(
    ride: RideRequest,
    availableDrivers: Driver[]
  ): Promise<AssignmentResult> {
    const nearestDrivers = findNearestDrivers(
      ride.pickup.lat,
      ride.pickup.lng,
      availableDrivers,
      {
        maxDistance: this.config.searchRadiusKm,
        maxResults: this.config.maxDriversToNotify,
        vehicleType: ride.vehicleType
      }
    );

    if (nearestDrivers.length === 0) {
      return {
        success: false,
        reason: 'No drivers available within search radius'
      };
    }

    const selected = nearestDrivers[0];
    
    return {
      success: true,
      driver: selected,
      distance: selected.distance,
      estimatedArrival: selected.estimatedArrival
    };
  }
}

/**
 * Assignation par file d'attente - premier arrivé, premier servi
 */
export class QueueAssignment {
  private queue: string[] = []; // Driver IDs in order of availability

  constructor(private config: DispatchConfig) {}

  /**
   * Ajoute un chauffeur à la queue
   */
  addToQueue(driverId: string): void {
    if (!this.queue.includes(driverId)) {
      this.queue.push(driverId);
    }
  }

  /**
   * Retire un chauffeur de la queue
   */
  removeFromQueue(driverId: string): void {
    this.queue = this.queue.filter(id => id !== driverId);
  }

  async findDriver(
    ride: RideRequest,
    availableDrivers: Driver[]
  ): Promise<AssignmentResult> {
    // Filtrer par type de véhicule et disponibilité
    const eligibleDrivers = availableDrivers.filter(d => 
      d.vehicleType === ride.vehicleType &&
      d.status === 'available' &&
      d.isActive
    );

    // Trouver le premier dans la queue qui est éligible
    for (const driverId of this.queue) {
      const driver = eligibleDrivers.find(d => d.id === driverId);
      
      if (driver && driver.currentLocation) {
        const distance = calculateDistance(
          ride.pickup.lat,
          ride.pickup.lng,
          driver.currentLocation.lat,
          driver.currentLocation.lng
        );

        if (distance <= this.config.maxSearchRadiusKm) {
          return {
            success: true,
            driver,
            distance,
            estimatedArrival: Math.round((distance / 30) * 60)
          };
        }
      }
    }

    return {
      success: false,
      reason: 'No eligible drivers in queue'
    };
  }
}

/**
 * Assignation par note - meilleure note dans le rayon
 */
export class RatingAssignment {
  constructor(private config: DispatchConfig) {}

  async findDriver(
    ride: RideRequest,
    availableDrivers: Driver[]
  ): Promise<AssignmentResult> {
    const nearestDrivers = findNearestDrivers(
      ride.pickup.lat,
      ride.pickup.lng,
      availableDrivers,
      {
        maxDistance: this.config.searchRadiusKm,
        maxResults: 20, // Plus large pool pour sélectionner par note
        vehicleType: ride.vehicleType
      }
    );

    if (nearestDrivers.length === 0) {
      return {
        success: false,
        reason: 'No drivers available'
      };
    }

    // Trier par note décroissante
    const sortedByRating = [...nearestDrivers].sort((a, b) => b.rating - a.rating);
    const selected = sortedByRating[0];

    return {
      success: true,
      driver: selected,
      distance: selected.distance,
      estimatedArrival: selected.estimatedArrival
    };
  }
}

/**
 * Assignation équilibrée - combine proximité, note et nombre de courses
 */
export class BalancedAssignment {
  constructor(private config: DispatchConfig) {}

  async findDriver(
    ride: RideRequest,
    availableDrivers: Driver[]
  ): Promise<AssignmentResult> {
    const nearestDrivers = findNearestDrivers(
      ride.pickup.lat,
      ride.pickup.lng,
      availableDrivers,
      {
        maxDistance: this.config.searchRadiusKm,
        maxResults: 20,
        vehicleType: ride.vehicleType
      }
    );

    if (nearestDrivers.length === 0) {
      return {
        success: false,
        reason: 'No drivers available'
      };
    }

    // Score combiné: 40% proximité, 30% note, 30% équité (moins de courses)
    const maxDistance = Math.max(...nearestDrivers.map(d => d.distance));
    const maxRides = Math.max(...nearestDrivers.map(d => d.totalRides)) || 1;

    const scored = nearestDrivers.map(driver => {
      const proximityScore = 1 - (driver.distance / maxDistance); // Plus proche = mieux
      const ratingScore = driver.rating / 5; // Note sur 5
      const fairnessScore = 1 - (driver.totalRides / maxRides); // Moins de courses = mieux

      const totalScore = (proximityScore * 0.4) + (ratingScore * 0.3) + (fairnessScore * 0.3);

      return { ...driver, score: totalScore };
    });

    // Trier par score
    scored.sort((a, b) => b.score - a.score);
    const selected = scored[0];

    return {
      success: true,
      driver: selected,
      distance: selected.distance,
      estimatedArrival: selected.estimatedArrival
    };
  }
}
