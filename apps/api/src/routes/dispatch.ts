/**
 * Routes API - Dispatch automatique des chauffeurs
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { calculateDistance } from './utils/geo';
import { isFeatureAllowed } from '../lib/plan-limits';
import logger from '../lib/logger';
import { wsManager } from '../lib/websocket';

const router = Router();

// Configuration du dispatch
interface DispatchConfig {
  searchRadiusKm: number;
  maxSearchRadiusKm: number;
  maxDriversToNotify: number;
  driverResponseTimeoutSec: number;
  assignmentStrategy: 'nearest' | 'rating' | 'balanced';
}

const DEFAULT_CONFIG: DispatchConfig = {
  searchRadiusKm: 5,
  maxSearchRadiusKm: 15,
  maxDriversToNotify: 5,
  driverResponseTimeoutSec: 30,
  assignmentStrategy: 'nearest'
};

// Schémas de validation
const dispatchRequestSchema = z.object({
  bookingId: z.string().uuid(),
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional()
  }),
  vehicleType: z.string().optional(),
  requiredCapacity: z.number().int().positive().optional(),
  preferredDriverIds: z.array(z.string().uuid()).optional(),
  excludeDriverIds: z.array(z.string().uuid()).optional(),
  maxWaitTimeMins: z.number().int().positive().optional().default(15)
});

const driverResponseSchema = z.object({
  requestId: z.string().uuid(),
  driverId: z.string().uuid(),
  accepted: z.boolean(),
  declineReason: z.string().optional()
});

// Store en mémoire pour les requêtes de dispatch actives
const activeDispatchRequests = new Map<string, {
  bookingId: string;
  tenantId: string;
  pickup: { lat: number; lng: number };
  notifiedDrivers: string[];
  acceptedBy?: string;
  createdAt: Date;
  expiresAt: Date;
}>();

/**
 * Middleware: Vérifier si le dispatch est activé pour ce plan
 */
function checkDispatchFeature(req: Request, res: Response, next: Function) {
  if (!isFeatureAllowed(req.tenant!.plan, 'dispatch')) {
    return res.status(403).json({
      error: 'FEATURE_NOT_AVAILABLE',
      message: 'Automatic dispatch is not available on your plan. Please upgrade to use this feature.',
      requiredPlan: 'starter'
    });
  }
  next();
}

/**
 * POST /api/v1/dispatch/request
 * Lance une recherche de chauffeur pour une réservation
 */
router.post('/request', checkDispatchFeature, async (req: Request, res: Response) => {
  try {
    const params = dispatchRequestSchema.parse(req.body);
    const tenantId = req.tenant!.id;
    
    logger.info('Dispatch request started', { tenantId, bookingId: params.bookingId });

    // Charger la configuration du tenant
    const config = { ...DEFAULT_CONFIG };
    
    // Rechercher les chauffeurs disponibles
    let query = supabase
      .from('drivers')
      .select('id, first_name, last_name, vehicle_type, rating, current_location, fcm_token')
      .eq('tenant_id', tenantId)
      .eq('status', 'available')
      .eq('is_active', true);
    
    if (params.vehicleType) {
      query = query.eq('vehicle_type', params.vehicleType);
    }
    if (params.excludeDriverIds?.length) {
      query = query.not('id', 'in', `(${params.excludeDriverIds.join(',')})`);
    }
    
    const { data: drivers, error } = await query;
    
    if (error) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
    }

    if (!drivers || drivers.length === 0) {
      return res.json({
        success: true,
        data: {
          status: 'no_drivers',
          message: 'No available drivers found',
          bookingId: params.bookingId
        }
      });
    }

    // Filtrer et trier les chauffeurs par distance
    let eligibleDrivers = drivers
      .filter(d => d.current_location)
      .map(d => ({
        ...d,
        distance: calculateDistance(
          params.pickup.lat, params.pickup.lng,
          d.current_location.lat, d.current_location.lng
        )
      }))
      .filter(d => d.distance <= config.maxSearchRadiusKm);

    // Prioriser les chauffeurs préférés
    if (params.preferredDriverIds?.length) {
      eligibleDrivers.sort((a, b) => {
        const aPreferred = params.preferredDriverIds!.includes(a.id) ? 0 : 1;
        const bPreferred = params.preferredDriverIds!.includes(b.id) ? 0 : 1;
        return aPreferred - bPreferred;
      });
    }

    // Stratégie d'assignation
    switch (config.assignmentStrategy) {
      case 'nearest':
        eligibleDrivers.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        eligibleDrivers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'balanced':
        // Mix distance (70%) et rating (30%)
        eligibleDrivers.sort((a, b) => {
          const aScore = (1 / (a.distance + 1)) * 0.7 + (a.rating || 3) / 5 * 0.3;
          const bScore = (1 / (b.distance + 1)) * 0.7 + (b.rating || 3) / 5 * 0.3;
          return bScore - aScore;
        });
        break;
    }

    // Limiter au nombre max de chauffeurs à notifier
    const driversToNotify = eligibleDrivers.slice(0, config.maxDriversToNotify);
    
    if (driversToNotify.length === 0) {
      return res.json({
        success: true,
        data: {
          status: 'no_nearby_drivers',
          message: `No drivers found within ${config.maxSearchRadiusKm}km`,
          bookingId: params.bookingId
        }
      });
    }

    // Créer un ID de requête de dispatch
    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + params.maxWaitTimeMins * 60 * 1000);
    
    // Stocker la requête
    activeDispatchRequests.set(requestId, {
      bookingId: params.bookingId,
      tenantId,
      pickup: params.pickup,
      notifiedDrivers: driversToNotify.map(d => d.id),
      createdAt: new Date(),
      expiresAt
    });

    // Mettre à jour la réservation avec le statut de dispatch
    await supabase
      .from('tenant_bookings')
      .update({ 
        status: 'dispatching',
        dispatch_request_id: requestId
      })
      .eq('id', params.bookingId)
      .eq('tenant_id', tenantId);

    // TODO: Envoyer les notifications push aux chauffeurs
    // Pour chaque chauffeur: envoyer via FCM/WebSocket
    
    // Notifier les chauffeurs via WebSocket
    driversToNotify.forEach(driver => {
      wsManager.notifyDriver(driver.id, 'booking:dispatch_request', {
        requestId,
        bookingId: params.bookingId,
        pickup: params.pickup,
        vehicleType: params.vehicleType,
        distance: Math.round(driver.distance * 100) / 100,
        timeout: config.driverResponseTimeoutSec,
        expiresAt: expiresAt.toISOString()
      });
    });

    // Notifier les admins qu'un dispatch est en cours
    wsManager.notifyTenantAdmins(tenantId, 'dispatch:started', {
      requestId,
      bookingId: params.bookingId,
      driversNotified: driversToNotify.length,
      timestamp: new Date().toISOString()
    });

    logger.info('Dispatch notifications sent', { 
      requestId, 
      driverCount: driversToNotify.length 
    });

    res.json({
      success: true,
      data: {
        requestId,
        status: 'searching',
        bookingId: params.bookingId,
        driversNotified: driversToNotify.length,
        drivers: driversToNotify.map(d => ({
          id: d.id,
          name: `${d.first_name} ${d.last_name}`,
          distance: Math.round(d.distance * 100) / 100,
          rating: d.rating,
          vehicleType: d.vehicle_type
        })),
        expiresAt: expiresAt.toISOString(),
        timeout: config.driverResponseTimeoutSec
      }
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

/**
 * POST /api/v1/dispatch/respond
 * Réponse d'un chauffeur à une demande de dispatch
 */
router.post('/respond', checkDispatchFeature, async (req: Request, res: Response) => {
  try {
    const { requestId, driverId, accepted, declineReason } = driverResponseSchema.parse(req.body);
    
    const dispatchRequest = activeDispatchRequests.get(requestId);
    
    if (!dispatchRequest) {
      return res.status(404).json({
        error: 'REQUEST_NOT_FOUND',
        message: 'Dispatch request not found or expired'
      });
    }

    if (dispatchRequest.tenantId !== req.tenant!.id) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'This dispatch request belongs to another tenant'
      });
    }

    if (dispatchRequest.acceptedBy) {
      return res.status(409).json({
        error: 'ALREADY_ASSIGNED',
        message: 'This booking has already been assigned to another driver'
      });
    }

    if (!dispatchRequest.notifiedDrivers.includes(driverId)) {
      return res.status(403).json({
        error: 'DRIVER_NOT_NOTIFIED',
        message: 'This driver was not notified for this request'
      });
    }

    if (new Date() > dispatchRequest.expiresAt) {
      activeDispatchRequests.delete(requestId);
      return res.status(410).json({
        error: 'REQUEST_EXPIRED',
        message: 'This dispatch request has expired'
      });
    }

    if (accepted) {
      // Marquer comme accepté
      dispatchRequest.acceptedBy = driverId;
      
      // Mettre à jour la réservation
      const { data: booking } = await supabase
        .from('tenant_bookings')
        .update({
          status: 'assigned',
          driver_id: driverId,
          assigned_at: new Date().toISOString()
        })
        .eq('id', dispatchRequest.bookingId)
        .eq('tenant_id', dispatchRequest.tenantId)
        .select()
        .single();

      // Mettre à jour le statut du chauffeur
      await supabase
        .from('drivers')
        .update({ status: 'busy' })
        .eq('id', driverId)
        .eq('tenant_id', dispatchRequest.tenantId);

      // Notifier les autres chauffeurs que la course a été prise
      dispatchRequest.notifiedDrivers
        .filter(id => id !== driverId)
        .forEach(otherId => {
          wsManager.notifyDriver(otherId, 'booking:taken', {
            requestId,
            bookingId: dispatchRequest.bookingId,
            message: 'Cette course a été acceptée par un autre chauffeur'
          });
        });

      // Notifier les admins
      wsManager.notifyTenantAdmins(dispatchRequest.tenantId, 'dispatch:completed', {
        requestId,
        bookingId: dispatchRequest.bookingId,
        driverId,
        status: 'assigned',
        timestamp: new Date().toISOString()
      });

      // Notifier le chauffeur avec les détails de la course
      if (booking) {
        wsManager.notifyDriver(driverId, 'booking:assigned', {
          bookingId: booking.id,
          pickupAddress: booking.pickup_address,
          dropoffAddress: booking.dropoff_address,
          pickupLat: booking.pickup_lat,
          pickupLng: booking.pickup_lng,
          passengerName: booking.customer_name,
          passengerPhone: booking.customer_phone,
          estimatedPrice: booking.total_price,
          timestamp: new Date().toISOString()
        });
      }

      logger.event('dispatch_accepted', {
        requestId,
        driverId,
        bookingId: dispatchRequest.bookingId
      });

      // Nettoyer la requête
      activeDispatchRequests.delete(requestId);

      res.json({
        success: true,
        data: {
          status: 'assigned',
          bookingId: dispatchRequest.bookingId,
          driverId,
          message: 'Booking successfully assigned to driver'
        }
      });
    } else {
      // Chauffeur refuse
      dispatchRequest.notifiedDrivers = dispatchRequest.notifiedDrivers.filter(id => id !== driverId);
      
      logger.event('dispatch_declined', {
        requestId,
        driverId,
        reason: declineReason
      });

      // Si plus aucun chauffeur, marquer comme échec
      if (dispatchRequest.notifiedDrivers.length === 0) {
        await supabase
          .from('tenant_bookings')
          .update({ status: 'no_driver' })
          .eq('id', dispatchRequest.bookingId);
        
        activeDispatchRequests.delete(requestId);
        
        return res.json({
          success: true,
          data: {
            status: 'failed',
            message: 'All notified drivers declined. No driver available.',
            bookingId: dispatchRequest.bookingId
          }
        });
      }

      res.json({
        success: true,
        data: {
          status: 'declined',
          remainingDrivers: dispatchRequest.notifiedDrivers.length,
          message: 'Response recorded, waiting for other drivers'
        }
      });
    }
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

/**
 * GET /api/v1/dispatch/status/:requestId
 * Vérifie le statut d'une demande de dispatch
 */
router.get('/status/:requestId', checkDispatchFeature, async (req: Request, res: Response) => {
  const requestId = req.params.requestId;
  const dispatchRequest = activeDispatchRequests.get(requestId);

  if (!dispatchRequest) {
    // Vérifier dans la DB si la réservation a été assignée
    const { data: booking } = await supabase
      .from('tenant_bookings')
      .select('id, status, driver_id, assigned_at')
      .eq('dispatch_request_id', requestId)
      .eq('tenant_id', req.tenant!.id)
      .single();

    if (booking) {
      return res.json({
        success: true,
        data: {
          requestId,
          status: booking.status,
          bookingId: booking.id,
          driverId: booking.driver_id,
          assignedAt: booking.assigned_at
        }
      });
    }

    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Dispatch request not found'
    });
  }

  res.json({
    success: true,
    data: {
      requestId,
      status: dispatchRequest.acceptedBy ? 'assigned' : 'searching',
      bookingId: dispatchRequest.bookingId,
      driversNotified: dispatchRequest.notifiedDrivers.length,
      assignedDriver: dispatchRequest.acceptedBy,
      createdAt: dispatchRequest.createdAt.toISOString(),
      expiresAt: dispatchRequest.expiresAt.toISOString(),
      timeRemaining: Math.max(0, dispatchRequest.expiresAt.getTime() - Date.now())
    }
  });
});

/**
 * DELETE /api/v1/dispatch/cancel/:requestId
 * Annule une demande de dispatch en cours
 */
router.delete('/cancel/:requestId', checkDispatchFeature, async (req: Request, res: Response) => {
  const requestId = req.params.requestId;
  const dispatchRequest = activeDispatchRequests.get(requestId);

  if (!dispatchRequest) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Dispatch request not found or already completed'
    });
  }

  if (dispatchRequest.tenantId !== req.tenant!.id) {
    return res.status(403).json({
      error: 'ACCESS_DENIED'
    });
  }

  // Mettre à jour le statut de la réservation
  await supabase
    .from('tenant_bookings')
    .update({ status: 'pending' })
    .eq('id', dispatchRequest.bookingId)
    .eq('tenant_id', dispatchRequest.tenantId);

  activeDispatchRequests.delete(requestId);

  logger.event('dispatch_cancelled', { requestId });

  res.json({
    success: true,
    message: 'Dispatch request cancelled'
  });
});

/**
 * GET /api/v1/dispatch/config
 * Récupère la configuration de dispatch du tenant
 */
router.get('/config', checkDispatchFeature, async (req: Request, res: Response) => {
  // TODO: Charger depuis la DB tenant_config
  res.json({
    success: true,
    data: { config: DEFAULT_CONFIG }
  });
});

/**
 * PUT /api/v1/dispatch/config
 * Met à jour la configuration de dispatch
 */
router.put('/config', checkDispatchFeature, async (req: Request, res: Response) => {
  const configSchema = z.object({
    searchRadiusKm: z.number().min(1).max(50).optional(),
    maxSearchRadiusKm: z.number().min(5).max(100).optional(),
    maxDriversToNotify: z.number().min(1).max(20).optional(),
    driverResponseTimeoutSec: z.number().min(10).max(120).optional(),
    assignmentStrategy: z.enum(['nearest', 'rating', 'balanced']).optional()
  });

  try {
    const updates = configSchema.parse(req.body);
    
    // TODO: Sauvegarder dans la DB
    
    res.json({
      success: true,
      data: { config: { ...DEFAULT_CONFIG, ...updates } }
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

export default router;
