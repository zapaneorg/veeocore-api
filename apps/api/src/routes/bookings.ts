/**
 * Routes API - Bookings (Réservations)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { wsManager } from '../lib/websocket';

const router = Router();

// Schémas de validation
const bookingSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email().optional(),
  
  pickup: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  }),
  dropoff: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  }),
  stops: z.array(z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  })).optional(),
  
  vehicleType: z.string(),
  passengers: z.number().int().positive().default(1),
  luggage: z.number().int().min(0).default(0),
  
  scheduledFor: z.string().datetime().optional(),
  estimatedPrice: z.number().positive(),
  estimatedDistance: z.number().positive(),
  estimatedDuration: z.number().positive(),
  
  customerNotes: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'invoice']).default('card')
});

/**
 * GET /api/v1/bookings
 * Liste les réservations
 */
router.get('/', async (req: Request, res: Response) => {
  const { 
    status, 
    driverId, 
    customerId,
    from,
    to,
    limit = 50, 
    offset = 0 
  } = req.query;
  
  let query = supabase
    .from('tenant_bookings')
    .select('*, driver:tenant_drivers(id, first_name, last_name, vehicle_plate)')
    .eq('tenant_id', req.tenant!.id);
  
  if (status) {
    query = query.eq('status', status);
  }
  if (driverId) {
    query = query.eq('driver_id', driverId);
  }
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }
  if (from) {
    query = query.gte('created_at', from);
  }
  if (to) {
    query = query.lte('created_at', to);
  }
  
  const { data, error, count } = await query
    .range(Number(offset), Number(offset) + Number(limit) - 1)
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: {
      bookings: data || [],
      total: count,
      limit: Number(limit),
      offset: Number(offset)
    }
  });
});

/**
 * GET /api/v1/bookings/:id
 * Détails d'une réservation
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('tenant_bookings')
    .select('*, driver:tenant_drivers(id, first_name, last_name, phone, vehicle_plate)')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found' });
  }

  res.json({
    success: true,
    data: { booking: data }
  });
});

/**
 * POST /api/v1/bookings
 * Crée une nouvelle réservation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const bookingData = bookingSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from('tenant_bookings')
      .insert({
        tenant_id: req.tenant!.id,
        customer_name: bookingData.customerName,
        customer_phone: bookingData.customerPhone,
        customer_email: bookingData.customerEmail,
        
        pickup_address: bookingData.pickup.address,
        pickup_lat: bookingData.pickup.lat,
        pickup_lng: bookingData.pickup.lng,
        
        dropoff_address: bookingData.dropoff.address,
        dropoff_lat: bookingData.dropoff.lat,
        dropoff_lng: bookingData.dropoff.lng,
        
        stops: bookingData.stops || [],
        
        vehicle_type: bookingData.vehicleType,
        passengers: bookingData.passengers,
        luggage: bookingData.luggage,
        
        scheduled_for: bookingData.scheduledFor,
        base_price: bookingData.estimatedPrice,
        total_price: bookingData.estimatedPrice,
        estimated_distance_km: bookingData.estimatedDistance,
        estimated_duration_minutes: bookingData.estimatedDuration,
        
        internal_notes: bookingData.customerNotes,
        payment_method: bookingData.paymentMethod,
        
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: 'CREATE_ERROR', message: error.message });
    }

    // Émettre l'événement WebSocket pour la nouvelle réservation
    wsManager.emitNewBooking({
      tenant_id: req.tenant!.id,
      id: data.id,
      pickupAddress: data.pickup_address,
      dropoffAddress: data.dropoff_address,
      pickupTime: data.scheduled_for || new Date().toISOString(),
      estimatedPrice: data.total_price,
      vehicleType: data.vehicle_type,
      passengerName: data.customer_name
    });

    res.status(201).json({
      success: true,
      data: { booking: data }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid booking data',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/bookings/:id/assign
 * Assigne un chauffeur à une réservation
 */
router.post('/:id/assign', async (req: Request, res: Response) => {
  const { driverId } = req.body;
  
  if (!driverId) {
    return res.status(400).json({ error: 'MISSING_DRIVER', message: 'driverId is required' });
  }
  
  // Vérifier que le chauffeur est disponible
  const { data: driver } = await supabase
    .from('tenant_drivers')
    .select('id, status')
    .eq('id', driverId)
    .eq('tenant_id', req.tenant!.id)
    .single();
  
  if (!driver || driver.status !== 'available') {
    return res.status(400).json({ error: 'DRIVER_UNAVAILABLE', message: 'Driver is not available' });
  }
  
  // Assigner
  const { data, error } = await supabase
    .from('tenant_bookings')
    .update({
      driver_id: driverId,
      status: 'assigned',
      assigned_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Booking not found' });
  }
  
  // Mettre le chauffeur en busy
  await supabase
    .from('tenant_drivers')
    .update({ status: 'busy' })
    .eq('id', driverId);

  // Notifier le chauffeur via WebSocket
  wsManager.notifyDriver(driverId, 'booking:assigned', {
    bookingId: data.id,
    pickupAddress: data.pickup_address,
    dropoffAddress: data.dropoff_address,
    pickupTime: data.scheduled_for,
    passengerName: data.customer_name,
    passengerPhone: data.customer_phone,
    estimatedPrice: data.total_price,
    timestamp: new Date().toISOString()
  });

  // Notifier les admins
  wsManager.notifyTenantAdmins(req.tenant!.id, 'booking:assigned', {
    bookingId: data.id,
    driverId,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    data: { booking: data }
  });
});

/**
 * POST /api/v1/bookings/:id/status
 * Met à jour le statut d'une réservation
 */
router.post('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  
  const validStatuses = [
    'pending', 'scheduled', 'searching', 'assigned', 
    'driver_en_route', 'driver_arrived', 'in_progress', 
    'completed', 'cancelled'
  ];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'INVALID_STATUS', 
      message: `Status must be one of: ${validStatuses.join(', ')}` 
    });
  }
  
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString()
  };
  
  // Timestamps spécifiques selon le statut
  if (status === 'driver_en_route') updates.pickup_started_at = new Date().toISOString();
  if (status === 'driver_arrived') updates.driver_arrived_at = new Date().toISOString();
  if (status === 'in_progress') updates.ride_started_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('tenant_bookings')
    .update(updates)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Booking not found' });
  }
  
  // Libérer le chauffeur si terminée ou annulée
  if (['completed', 'cancelled'].includes(status) && data.driver_id) {
    await supabase
      .from('tenant_drivers')
      .update({ status: 'available' })
      .eq('id', data.driver_id);
  }

  // Émettre la notification WebSocket du changement de statut
  wsManager.emitBookingStatusChange(
    req.tenant!.id,
    data.id,
    status,
    data.driver_id
  );

  res.json({
    success: true,
    data: { booking: data }
  });
});

/**
 * POST /api/v1/bookings/:id/cancel
 * Annule une réservation
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const { reason } = req.body;
  
  const { data, error } = await supabase
    .from('tenant_bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Booking not found' });
  }
  
  // Libérer le chauffeur
  if (data.driver_id) {
    await supabase
      .from('tenant_drivers')
      .update({ status: 'available' })
      .eq('id', data.driver_id);
    
    // Notifier le chauffeur de l'annulation
    wsManager.notifyDriver(data.driver_id, 'booking:cancelled', {
      bookingId: data.id,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // Notifier les admins
  wsManager.notifyTenantAdmins(req.tenant!.id, 'booking:cancelled', {
    bookingId: data.id,
    reason,
    driverId: data.driver_id,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    data: { booking: data }
  });
});

/**
 * GET /api/v1/bookings/stats
 * Statistiques des réservations
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  const { from, to } = req.query;
  
  // Stats basiques
  const { data: bookings } = await supabase
    .from('tenant_bookings')
    .select('status, total_price, final_price')
    .eq('tenant_id', req.tenant!.id);
  
  const stats = {
    total: bookings?.length || 0,
    completed: bookings?.filter(b => b.status === 'completed').length || 0,
    cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
    pending: bookings?.filter(b => ['pending', 'scheduled', 'searching', 'assigned'].includes(b.status)).length || 0,
    totalRevenue: bookings?.filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.final_price || b.total_price || 0), 0) || 0,
    averagePrice: 0
  };
  
  if (stats.completed > 0) {
    stats.averagePrice = stats.totalRevenue / stats.completed;
  }

  res.json({
    success: true,
    data: { stats }
  });
});

export default router;
