/**
 * Routes API - Drivers (Gestion des chauffeurs)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const router = Router();

// Schémas de validation
const driverSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  vehicleType: z.string(),
  vehiclePlate: z.string(),
  preferences: z.object({
    acceptsAirport: z.boolean().optional(),
    acceptsLongDistance: z.boolean().optional(),
    maxDistance: z.number().optional()
  }).optional()
});

const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

const statusSchema = z.object({
  status: z.enum(['available', 'busy', 'offline', 'on_break'])
});

/**
 * GET /api/v1/drivers
 * Liste tous les chauffeurs du tenant
 */
router.get('/', async (req: Request, res: Response) => {
  const { status, vehicleType, limit = 50, offset = 0 } = req.query;
  
  let query = supabase
    .from('drivers')
    .select('*')
    .eq('tenant_id', req.tenant!.id);
  
  if (status) {
    query = query.eq('status', status);
  }
  if (vehicleType) {
    query = query.eq('vehicle_type', vehicleType);
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
      drivers: data || [],
      total: count,
      limit: Number(limit),
      offset: Number(offset)
    }
  });
});

/**
 * GET /api/v1/drivers/available
 * Liste les chauffeurs disponibles avec leur position
 */
router.get('/available', async (req: Request, res: Response) => {
  const { vehicleType, lat, lng, radius = 10 } = req.query;
  
  let query = supabase
    .from('drivers')
    .select('id, first_name, last_name, vehicle_type, vehicle_plate, rating, current_location')
    .eq('tenant_id', req.tenant!.id)
    .eq('status', 'available')
    .eq('is_active', true);
  
  if (vehicleType) {
    query = query.eq('vehicle_type', vehicleType);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  // Filtrer par distance si coordonnées fournies
  let drivers = data || [];
  if (lat && lng) {
    const centerLat = Number(lat);
    const centerLng = Number(lng);
    const maxRadius = Number(radius);
    
    drivers = drivers
      .filter(d => d.current_location)
      .map(d => ({
        ...d,
        distance: calculateDistance(
          centerLat, centerLng,
          d.current_location.lat, d.current_location.lng
        )
      }))
      .filter(d => d.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);
  }

  res.json({
    success: true,
    data: { drivers }
  });
});

/**
 * GET /api/v1/drivers/:id
 * Détails d'un chauffeur
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Driver not found' });
  }

  res.json({
    success: true,
    data: { driver: data }
  });
});

/**
 * POST /api/v1/drivers
 * Crée un nouveau chauffeur
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const driverData = driverSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        tenant_id: req.tenant!.id,
        first_name: driverData.firstName,
        last_name: driverData.lastName,
        email: driverData.email,
        phone: driverData.phone,
        vehicle_type: driverData.vehicleType,
        vehicle_plate: driverData.vehiclePlate,
        preferences: driverData.preferences || {},
        status: 'offline',
        is_active: true,
        rating: 5.0,
        total_rides: 0
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: 'CREATE_ERROR', message: error.message });
    }

    res.status(201).json({
      success: true,
      data: { driver: data }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid driver data',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * PATCH /api/v1/drivers/:id
 * Met à jour un chauffeur
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const updates = req.body;
  
  const { data, error } = await supabase
    .from('drivers')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'UPDATE_ERROR', message: error?.message || 'Driver not found' });
  }

  res.json({
    success: true,
    data: { driver: data }
  });
});

/**
 * POST /api/v1/drivers/:id/location
 * Met à jour la position d'un chauffeur
 */
router.post('/:id/location', async (req: Request, res: Response) => {
  try {
    const location = locationUpdateSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from('drivers')
      .update({
        current_location: {
          lat: location.lat,
          lng: location.lng,
          updated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenant!.id)
      .select()
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Driver not found' });
    }

    res.json({
      success: true,
      data: { driver: data }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid location data',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * POST /api/v1/drivers/:id/status
 * Met à jour le statut d'un chauffeur
 */
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = statusSchema.parse(req.body);
    
    const { data, error } = await supabase
      .from('drivers')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenant!.id)
      .select()
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Driver not found' });
    }

    res.json({
      success: true,
      data: { driver: data }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid status',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * DELETE /api/v1/drivers/:id
 * Désactive un chauffeur
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('drivers')
    .update({
      is_active: false,
      status: 'offline',
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'DELETE_ERROR', message: 'Driver not found' });
  }

  res.json({
    success: true,
    message: 'Driver deactivated'
  });
});

// ========== Helper Functions ==========

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default router;
