/**
 * VeeoCore WebSocket Server
 * Notifications temps réel pour chauffeurs et admins
 */

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';
import { supabase } from '../lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'veeocore-secret-key';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  userType?: 'driver' | 'admin' | 'tenant_admin';
  driverId?: string;
}

interface BookingEvent {
  type: 'new_booking' | 'booking_assigned' | 'booking_status_changed' | 'booking_cancelled';
  bookingId: string;
  tenantId: string;
  data: any;
}

interface DriverEvent {
  type: 'driver_status_changed' | 'driver_location_updated';
  driverId: string;
  tenantId: string;
  data: any;
}

class WebSocketManager {
  private io: Server | null = null;
  
  // Maps pour tracker les connexions
  private driverSockets: Map<string, string> = new Map(); // driverId -> socketId
  private tenantAdminSockets: Map<string, Set<string>> = new Map(); // tenantId -> Set<socketId>
  private socketToUser: Map<string, { type: string; id: string; tenantId: string }> = new Map();

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || '*',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.io.use(this.authMiddleware.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));

    logger.info('WebSocket server initialized');
    return this.io;
  }

  /**
   * Middleware d'authentification
   */
  private async authMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token as string, JWT_SECRET) as {
        userId?: string;
        driverId?: string;
        tenantId: string;
        type: string;
      };

      socket.tenantId = decoded.tenantId;
      socket.userType = decoded.type as 'driver' | 'admin' | 'tenant_admin';
      
      if (decoded.type === 'driver') {
        socket.driverId = decoded.driverId;
        socket.userId = decoded.driverId;
      } else {
        socket.userId = decoded.userId;
      }

      next();
    } catch (error) {
      logger.warn('WebSocket auth failed', { error });
      next(new Error('Invalid token'));
    }
  }

  /**
   * Gérer une nouvelle connexion
   */
  private handleConnection(socket: AuthenticatedSocket) {
    const { userId, tenantId, userType, driverId } = socket;
    
    logger.info('WebSocket connected', { socketId: socket.id, userType, tenantId });

    // Enregistrer la connexion
    if (userType === 'driver' && driverId) {
      this.driverSockets.set(driverId, socket.id);
      this.socketToUser.set(socket.id, { type: 'driver', id: driverId, tenantId: tenantId! });
      
      // Rejoindre le room du tenant
      socket.join(`tenant:${tenantId}`);
      socket.join(`driver:${driverId}`);
      
      // Notifier le driver qu'il est connecté
      socket.emit('connected', { status: 'ok', driverId });
      
      // Mettre à jour le statut du chauffeur comme en ligne
      this.updateDriverOnlineStatus(driverId!, true);
    }

    if (userType === 'tenant_admin' && tenantId) {
      if (!this.tenantAdminSockets.has(tenantId)) {
        this.tenantAdminSockets.set(tenantId, new Set());
      }
      this.tenantAdminSockets.get(tenantId)!.add(socket.id);
      this.socketToUser.set(socket.id, { type: 'admin', id: userId!, tenantId });
      
      socket.join(`tenant:${tenantId}`);
      socket.join(`tenant_admin:${tenantId}`);
      
      socket.emit('connected', { status: 'ok', tenantId });
    }

    // Event handlers
    this.setupEventHandlers(socket);

    // Déconnexion
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Setup des event handlers
   */
  private setupEventHandlers(socket: AuthenticatedSocket) {
    const { userType, driverId, tenantId } = socket;

    if (userType === 'driver') {
      // Le chauffeur met à jour sa position
      socket.on('location:update', async (data: { lat: number; lng: number }) => {
        if (!driverId || !tenantId) return;
        
        await this.updateDriverLocation(driverId, data.lat, data.lng);
        
        // Notifier les admins du tenant
        this.io?.to(`tenant_admin:${tenantId}`).emit('driver:location_updated', {
          driverId,
          location: data,
          timestamp: new Date().toISOString()
        });
      });

      // Le chauffeur change son statut
      socket.on('status:change', async (data: { status: 'available' | 'busy' | 'offline' }) => {
        if (!driverId || !tenantId) return;
        
        await this.updateDriverStatus(driverId, data.status);
        
        this.io?.to(`tenant_admin:${tenantId}`).emit('driver:status_changed', {
          driverId,
          status: data.status,
          timestamp: new Date().toISOString()
        });
      });

      // Le chauffeur accepte une course
      socket.on('booking:accept', async (data: { bookingId: string }) => {
        // Géré côté API, mais on peut émettre la confirmation
        socket.emit('booking:accepted', { bookingId: data.bookingId });
      });

      // Le chauffeur met à jour le statut d'une course
      socket.on('booking:status', async (data: { bookingId: string; status: string }) => {
        if (!tenantId) return;
        
        this.io?.to(`tenant_admin:${tenantId}`).emit('booking:status_changed', {
          bookingId: data.bookingId,
          status: data.status,
          driverId,
          timestamp: new Date().toISOString()
        });
      });
    }

    if (userType === 'tenant_admin') {
      // L'admin assigne un chauffeur à une course
      socket.on('dispatch:assign', async (data: { bookingId: string; driverId: string }) => {
        // Notifier le chauffeur
        this.notifyDriver(data.driverId, 'booking:assigned', {
          bookingId: data.bookingId,
          timestamp: new Date().toISOString()
        });
      });

      // L'admin envoie un message à un chauffeur
      socket.on('driver:message', async (data: { driverId: string; message: string }) => {
        this.notifyDriver(data.driverId, 'message:received', {
          message: data.message,
          from: 'admin',
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  /**
   * Gérer la déconnexion
   */
  private handleDisconnect(socket: AuthenticatedSocket) {
    const userInfo = this.socketToUser.get(socket.id);
    
    if (userInfo) {
      if (userInfo.type === 'driver') {
        this.driverSockets.delete(userInfo.id);
        this.updateDriverOnlineStatus(userInfo.id, false);
      }
      
      if (userInfo.type === 'admin') {
        const adminSockets = this.tenantAdminSockets.get(userInfo.tenantId);
        adminSockets?.delete(socket.id);
      }
      
      this.socketToUser.delete(socket.id);
    }

    logger.info('WebSocket disconnected', { socketId: socket.id });
  }

  // === Public Methods ===

  /**
   * Notifier un chauffeur spécifique
   */
  notifyDriver(driverId: string, event: string, data: any) {
    const socketId = this.driverSockets.get(driverId);
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
      logger.debug('Notified driver', { driverId, event });
    }
  }

  /**
   * Notifier tous les chauffeurs d'un tenant
   */
  notifyTenantDrivers(tenantId: string, event: string, data: any) {
    this.io?.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Notifier les admins d'un tenant
   */
  notifyTenantAdmins(tenantId: string, event: string, data: any) {
    this.io?.to(`tenant_admin:${tenantId}`).emit(event, data);
  }

  /**
   * Émettre un événement de nouvelle réservation
   */
  emitNewBooking(booking: any) {
    const { tenant_id, id, ...rest } = booking;
    
    // Notifier tous les chauffeurs disponibles du tenant
    this.io?.to(`tenant:${tenant_id}`).emit('booking:new', {
      bookingId: id,
      ...rest,
      timestamp: new Date().toISOString()
    });

    // Notifier les admins
    this.notifyTenantAdmins(tenant_id, 'booking:created', {
      bookingId: id,
      ...rest
    });

    logger.info('Emitted new booking event', { tenantId: tenant_id, bookingId: id });
  }

  /**
   * Émettre un changement de statut de réservation
   */
  emitBookingStatusChange(tenantId: string, bookingId: string, status: string, driverId?: string) {
    const data = {
      bookingId,
      status,
      driverId,
      timestamp: new Date().toISOString()
    };

    // Notifier le chauffeur assigné
    if (driverId) {
      this.notifyDriver(driverId, 'booking:status_changed', data);
    }

    // Notifier les admins
    this.notifyTenantAdmins(tenantId, 'booking:status_changed', data);
  }

  /**
   * Émettre la position d'un chauffeur (pour le dispatch map)
   */
  emitDriverLocation(tenantId: string, driverId: string, lat: number, lng: number) {
    this.notifyTenantAdmins(tenantId, 'driver:location_updated', {
      driverId,
      location: { lat, lng },
      timestamp: new Date().toISOString()
    });
  }

  // === Private helpers ===

  private async updateDriverOnlineStatus(driverId: string, isOnline: boolean) {
    try {
      await supabase
        .from('drivers')
        .update({ 
          is_online: isOnline,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', driverId);
    } catch (error) {
      logger.error('Failed to update driver online status', { driverId, error });
    }
  }

  private async updateDriverLocation(driverId: string, lat: number, lng: number) {
    try {
      await supabase
        .from('drivers')
        .update({
          last_location: { lat, lng },
          last_seen_at: new Date().toISOString()
        })
        .eq('id', driverId);
    } catch (error) {
      logger.error('Failed to update driver location', { driverId, error });
    }
  }

  private async updateDriverStatus(driverId: string, status: string) {
    try {
      await supabase
        .from('drivers')
        .update({ status })
        .eq('id', driverId);
    } catch (error) {
      logger.error('Failed to update driver status', { driverId, error });
    }
  }

  /**
   * Obtenir les stats des connexions
   */
  getStats() {
    return {
      connectedDrivers: this.driverSockets.size,
      connectedAdmins: Array.from(this.tenantAdminSockets.values()).reduce((sum, set) => sum + set.size, 0),
      totalSockets: this.socketToUser.size
    };
  }
}

// Export singleton
export const wsManager = new WebSocketManager();
export default wsManager;
