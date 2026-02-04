/**
 * Routes API - Actions chauffeur (courses, notifications, position)
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'veeocore-driver-secret-key';

// Middleware d'authentification chauffeur
const authenticateDriver = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'TOKEN_REQUIRED', message: 'Token requis' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { driverId: string; tenantId: string; type: string };
    
    if (decoded.type !== 'driver') {
      return res.status(403).json({ error: 'INVALID_TOKEN', message: 'Token invalide' });
    }

    (req as any).driver = { id: decoded.driverId, tenantId: decoded.tenantId };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token expiré' });
  }
};

router.use(authenticateDriver);

/**
 * PUT /api/v1/driver/status
 * Mettre à jour le statut du chauffeur
 */
router.put('/status', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;
  const { status } = req.body;

  if (!['available', 'busy', 'offline'].includes(status)) {
    return res.status(400).json({
      error: 'INVALID_STATUS',
      message: 'Statut invalide'
    });
  }

  const { error } = await supabase
    .from('drivers')
    .update({ status, last_seen_at: new Date().toISOString() })
    .eq('id', driverId);

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({ success: true, data: { status } });
});

/**
 * GET /api/v1/driver/booking/active
 * Récupérer la course active du chauffeur
 */
router.get('/booking/active', async (req: Request, res: Response) => {
  const { id: driverId, tenantId } = (req as any).driver;

  const { data, error } = await supabase
    .from('tenant_bookings')
    .select('*')
    .eq('driver_id', driverId)
    .eq('tenant_id', tenantId)
    .in('status', ['assigned', 'en_route', 'arrived', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: data ? {
      id: data.id,
      reference: data.booking_reference,
      status: data.status,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      pickupAddress: data.pickup_address,
      pickupLat: data.pickup_lat,
      pickupLng: data.pickup_lng,
      dropoffAddress: data.dropoff_address,
      dropoffLat: data.dropoff_lat,
      dropoffLng: data.dropoff_lng,
      distanceKm: data.distance_km,
      durationMinutes: data.duration_minutes,
      totalPrice: data.total_price,
      passengers: data.passengers,
      vehicleType: data.vehicle_type,
      scheduledAt: data.scheduled_at,
      notes: data.notes,
    } : null
  });
});

/**
 * GET /api/v1/driver/bookings/pending
 * Récupérer les courses en attente d'attribution
 */
router.get('/bookings/pending', async (req: Request, res: Response) => {
  const { tenantId } = (req as any).driver;

  const { data, error } = await supabase
    .from('tenant_bookings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .is('driver_id', null)
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: data.map(b => ({
      id: b.id,
      reference: b.booking_reference,
      status: b.status,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      pickupAddress: b.pickup_address,
      dropoffAddress: b.dropoff_address,
      distanceKm: b.distance_km,
      durationMinutes: b.duration_minutes,
      totalPrice: b.total_price,
      passengers: b.passengers,
      vehicleType: b.vehicle_type,
      scheduledAt: b.scheduled_at,
    }))
  });
});

/**
 * POST /api/v1/driver/booking/:id/accept
 * Accepter une course
 */
router.post('/booking/:id/accept', async (req: Request, res: Response) => {
  const { id: driverId, tenantId } = (req as any).driver;
  const { id: bookingId } = req.params;

  // Vérifier que la course est disponible
  const { data: booking, error: fetchError } = await supabase
    .from('tenant_bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .is('driver_id', null)
    .single();

  if (fetchError || !booking) {
    return res.status(404).json({
      error: 'BOOKING_NOT_AVAILABLE',
      message: 'Cette course n\'est plus disponible'
    });
  }

  // Assigner la course
  const { error: updateError } = await supabase
    .from('tenant_bookings')
    .update({ 
      driver_id: driverId, 
      status: 'assigned',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId);

  if (updateError) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: updateError.message });
  }

  // Mettre à jour le statut du chauffeur
  await supabase
    .from('drivers')
    .update({ status: 'busy' })
    .eq('id', driverId);

  res.json({
    success: true,
    message: 'Course acceptée',
    data: {
      id: booking.id,
      reference: booking.booking_reference,
      status: 'assigned'
    }
  });
});

/**
 * POST /api/v1/driver/booking/:id/decline
 * Refuser une course
 */
router.post('/booking/:id/decline', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;
  const { id: bookingId } = req.params;
  
  // On pourrait logger le refus pour les stats
  res.json({
    success: true,
    message: 'Course refusée'
  });
});

/**
 * PUT /api/v1/driver/booking/:id/status
 * Mettre à jour le statut d'une course
 */
router.put('/booking/:id/status', async (req: Request, res: Response) => {
  const { id: driverId, tenantId } = (req as any).driver;
  const { id: bookingId } = req.params;
  const { status } = req.body;

  const validStatuses = ['en_route', 'arrived', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'INVALID_STATUS',
      message: 'Statut invalide'
    });
  }

  // Vérifier que la course appartient au chauffeur
  const { data: booking, error: fetchError } = await supabase
    .from('tenant_bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('driver_id', driverId)
    .single();

  if (fetchError || !booking) {
    return res.status(404).json({
      error: 'BOOKING_NOT_FOUND',
      message: 'Course non trouvée'
    });
  }

  const updates: Record<string, any> = { 
    status, 
    updated_at: new Date().toISOString() 
  };

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
    
    // Mettre à jour les stats du chauffeur
    await supabase.rpc('increment_driver_stats', {
      p_driver_id: driverId,
      p_earnings: booking.total_price
    });
  }

  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('tenant_bookings')
    .update(updates)
    .eq('id', bookingId);

  if (updateError) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: updateError.message });
  }

  // Si la course est terminée ou annulée, remettre le chauffeur disponible
  if (['completed', 'cancelled'].includes(status)) {
    await supabase
      .from('drivers')
      .update({ status: 'available' })
      .eq('id', driverId);
  }

  res.json({
    success: true,
    message: `Statut mis à jour: ${status}`,
    data: { status }
  });
});

/**
 * GET /api/v1/driver/bookings/history
 * Historique des courses du chauffeur
 */
router.get('/bookings/history', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('tenant_bookings')
    .select('*', { count: 'exact' })
    .eq('driver_id', driverId)
    .in('status', ['completed', 'cancelled'])
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: data.map(b => ({
      id: b.id,
      reference: b.booking_reference,
      status: b.status,
      customerName: b.customer_name,
      pickupAddress: b.pickup_address,
      dropoffAddress: b.dropoff_address,
      distanceKm: b.distance_km,
      durationMinutes: b.duration_minutes,
      totalPrice: b.total_price,
      scheduledAt: b.scheduled_at,
      completedAt: b.completed_at,
    })),
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  });
});

/**
 * GET /api/v1/driver/notifications
 * Notifications du chauffeur
 */
router.get('/notifications', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;

  const { data, error } = await supabase
    .from('driver_notifications')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: data.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      bookingId: n.booking_id,
      isRead: n.is_read,
      createdAt: n.created_at,
    }))
  });
});

/**
 * PUT /api/v1/driver/notifications/:id/read
 * Marquer une notification comme lue
 */
router.put('/notifications/:id/read', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;
  const { id: notificationId } = req.params;

  await supabase
    .from('driver_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('driver_id', driverId);

  res.json({ success: true });
});

/**
 * PUT /api/v1/driver/notifications/read-all
 * Marquer toutes les notifications comme lues
 */
router.put('/notifications/read-all', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;

  await supabase
    .from('driver_notifications')
    .update({ is_read: true })
    .eq('driver_id', driverId)
    .eq('is_read', false);

  res.json({ success: true });
});

/**
 * POST /api/v1/driver/location
 * Mettre à jour la position du chauffeur
 */
router.post('/location', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      error: 'INVALID_COORDINATES',
      message: 'Coordonnées invalides'
    });
  }

  await supabase
    .from('drivers')
    .update({ 
      last_location: { lat, lng },
      last_seen_at: new Date().toISOString()
    })
    .eq('id', driverId);

  res.json({ success: true });
});

/**
 * GET /api/v1/driver/stats/today
 * Statistiques du jour
 */
router.get('/stats/today', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: bookings } = await supabase
    .from('tenant_bookings')
    .select('total_price, status')
    .eq('driver_id', driverId)
    .gte('completed_at', todayStart.toISOString());

  const completed = bookings?.filter(b => b.status === 'completed') || [];
  const earnings = completed.reduce((sum, b) => sum + (b.total_price || 0), 0);

  const { data: driver } = await supabase
    .from('drivers')
    .select('rating')
    .eq('id', driverId)
    .single();

  res.json({
    success: true,
    data: {
      rides: completed.length,
      earnings,
      rating: driver?.rating || 5.0,
      acceptanceRate: 95 // À calculer réellement
    }
  });
});

/**
 * GET /api/v1/driver/profile
 * Profil du chauffeur
 */
router.get('/profile', async (req: Request, res: Response) => {
  const { id: driverId } = (req as any).driver;

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Profil non trouvé' });
  }

  res.json({
    success: true,
    data: {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      vehicleType: data.vehicle_type,
      vehiclePlate: data.vehicle_plate,
      vehicleBrand: data.vehicle_brand,
      vehicleModel: data.vehicle_model,
      vehicleColor: data.vehicle_color,
      rating: data.rating || 5.0,
      totalRides: data.total_rides || 0,
      earningsTotal: data.earnings_total || 0,
      earningsMonth: data.earnings_month || 0,
    }
  });
});

export default router;
