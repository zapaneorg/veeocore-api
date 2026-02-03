/**
 * Service de notifications
 */

import type { 
  Notification, 
  NotificationType, 
  NotificationChannel,
  Driver,
  RideRequest
} from './types';

interface NotificationProvider {
  send(notification: Notification): Promise<boolean>;
}

export class NotificationService {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map();
  private notifications: Notification[] = [];

  /**
   * Enregistre un provider de notification
   */
  registerProvider(channel: NotificationChannel, provider: NotificationProvider): void {
    this.providers.set(channel, provider);
  }

  /**
   * Envoie une notification
   */
  async send(notification: Omit<Notification, 'id' | 'status' | 'createdAt'>): Promise<Notification> {
    const fullNotification: Notification = {
      ...notification,
      id: generateId(),
      status: 'pending',
      createdAt: new Date()
    };

    const provider = this.providers.get(notification.channel);
    
    if (!provider) {
      fullNotification.status = 'failed';
      fullNotification.error = `No provider for channel: ${notification.channel}`;
    } else {
      try {
        const success = await provider.send(fullNotification);
        fullNotification.status = success ? 'sent' : 'failed';
        fullNotification.sentAt = new Date();
      } catch (error) {
        fullNotification.status = 'failed';
        fullNotification.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    this.notifications.push(fullNotification);
    return fullNotification;
  }

  /**
   * Notifie un chauffeur d'une nouvelle course
   */
  async notifyNewRide(driver: Driver, ride: RideRequest): Promise<Notification | null> {
    if (!driver.fcmToken && !driver.apnsToken) {
      return null;
    }

    return this.send({
      type: 'new_ride_request',
      channel: 'push',
      recipientId: driver.id,
      recipientType: 'driver',
      title: '🚗 Nouvelle course !',
      body: `${ride.pickup.address} → ${ride.dropoff.address}`,
      data: {
        rideId: ride.id,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        price: ride.estimatedPrice,
        distance: ride.estimatedDistance
      }
    });
  }

  /**
   * Notifie que le chauffeur est en route
   */
  async notifyDriverEnRoute(
    customerId: string, 
    driver: Driver, 
    estimatedArrival: number
  ): Promise<Notification> {
    return this.send({
      type: 'driver_en_route',
      channel: 'push',
      recipientId: customerId,
      recipientType: 'customer',
      title: '🚗 Chauffeur en route',
      body: `${driver.firstName} arrive dans ~${estimatedArrival} min`,
      data: {
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        vehiclePlate: driver.vehiclePlate,
        estimatedArrival
      }
    });
  }

  /**
   * Notifie que le chauffeur est arrivé
   */
  async notifyDriverArrived(customerId: string, driver: Driver): Promise<Notification> {
    return this.send({
      type: 'driver_arrived',
      channel: 'push',
      recipientId: customerId,
      recipientType: 'customer',
      title: '✅ Chauffeur arrivé',
      body: `${driver.firstName} vous attend - ${driver.vehiclePlate}`,
      data: {
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        vehiclePlate: driver.vehiclePlate
      }
    });
  }

  /**
   * Notifie la fin de course
   */
  async notifyRideCompleted(
    customerId: string, 
    totalPrice: number,
    driverName: string
  ): Promise<Notification> {
    return this.send({
      type: 'ride_completed',
      channel: 'push',
      recipientId: customerId,
      recipientType: 'customer',
      title: '🎉 Course terminée',
      body: `Merci d'avoir voyagé avec ${driverName}. Total: ${totalPrice.toFixed(2)}€`,
      data: { totalPrice }
    });
  }

  /**
   * Notifie annulation
   */
  async notifyRideCancelled(
    recipientId: string,
    recipientType: 'driver' | 'customer',
    reason?: string
  ): Promise<Notification> {
    return this.send({
      type: 'ride_cancelled',
      channel: 'push',
      recipientId,
      recipientType,
      title: '❌ Course annulée',
      body: reason || 'La course a été annulée',
      data: { reason }
    });
  }

  /**
   * Récupère l'historique des notifications
   */
  getHistory(filters?: {
    recipientId?: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    limit?: number;
  }): Notification[] {
    let result = [...this.notifications];
    
    if (filters?.recipientId) {
      result = result.filter(n => n.recipientId === filters.recipientId);
    }
    if (filters?.type) {
      result = result.filter(n => n.type === filters.type);
    }
    if (filters?.channel) {
      result = result.filter(n => n.channel === filters.channel);
    }
    
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }
    
    return result;
  }

  /**
   * Statistiques
   */
  getStats(): {
    total: number;
    sent: number;
    failed: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
  } {
    const byChannel: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    for (const n of this.notifications) {
      byChannel[n.channel] = (byChannel[n.channel] || 0) + 1;
      byType[n.type] = (byType[n.type] || 0) + 1;
    }
    
    return {
      total: this.notifications.length,
      sent: this.notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length,
      failed: this.notifications.filter(n => n.status === 'failed').length,
      byChannel,
      byType
    };
  }
}

// Utility
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
