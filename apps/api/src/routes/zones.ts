/**
 * Routes API - Zones de tarification et routes à prix fixe
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { isPointInPolygon, calculateDistance } from './utils/geo';
import { checkLimit, isFeatureAllowed } from '../lib/plan-limits';

const router = Router();

// Schémas de validation
const zoneSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['polygon', 'circle']),
  // Pour polygon
  coordinates: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).optional(),
  // Pour circle
  center: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  radiusKm: z.number().positive().optional(),
  // Tarifs de la zone
  pricing: z.object({
    surchargePercent: z.number().min(-50).max(100).optional(), // -50% à +100%
    surchargeFixed: z.number().min(0).optional(),
    minimumFare: z.number().positive().optional(),
    perKmMultiplier: z.number().min(0.5).max(3).optional()
  }).optional(),
  isActive: z.boolean().optional().default(true)
});

const fixedRouteSchema = z.object({
  name: z.string().min(1),
  origin: z.object({
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    radiusKm: z.number().positive().default(1)
  }),
  destination: z.object({
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    radiusKm: z.number().positive().default(1)
  }),
  prices: z.record(z.string(), z.number().positive()), // { standard: 25, premium: 35, van: 50 }
  bidirectional: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true)
});

const checkZoneSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

const checkRouteSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() })
});

// ==================== ZONES ====================

/**
 * GET /api/v1/zones
 * Liste toutes les zones du tenant
 */
router.get('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('pricing_zones')
    .select('*')
    .eq('tenant_id', req.tenant!.id)
    .order('name');

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: { zones: data || [] }
  });
});

/**
 * POST /api/v1/zones
 * Crée une nouvelle zone
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const zoneData = zoneSchema.parse(req.body);
    
    // Vérifier les limites du plan
    const { data: existingZones } = await supabase
      .from('pricing_zones')
      .select('id')
      .eq('tenant_id', req.tenant!.id);
    
    const limitCheck = checkLimit(req.tenant!.plan, 'maxZones', existingZones?.length || 0);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `Your plan allows a maximum of ${limitCheck.limit} zones. Please upgrade to add more.`,
        limit: limitCheck.limit
      });
    }

    // Validation selon le type
    if (zoneData.type === 'polygon' && (!zoneData.coordinates || zoneData.coordinates.length < 3)) {
      return res.status(400).json({
        error: 'INVALID_POLYGON',
        message: 'Polygon zones require at least 3 coordinates'
      });
    }
    if (zoneData.type === 'circle' && (!zoneData.center || !zoneData.radiusKm)) {
      return res.status(400).json({
        error: 'INVALID_CIRCLE',
        message: 'Circle zones require center and radiusKm'
      });
    }

    const { data, error } = await supabase
      .from('pricing_zones')
      .insert({
        tenant_id: req.tenant!.id,
        name: zoneData.name,
        type: zoneData.type,
        coordinates: zoneData.coordinates,
        center: zoneData.center,
        radius_km: zoneData.radiusKm,
        pricing: zoneData.pricing || {},
        is_active: zoneData.isActive
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
    }

    res.status(201).json({
      success: true,
      data: { zone: data }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid zone data',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * PUT /api/v1/zones/:id
 * Met à jour une zone
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const zoneData = zoneSchema.partial().parse(req.body);

    const { data, error } = await supabase
      .from('pricing_zones')
      .update({
        name: zoneData.name,
        type: zoneData.type,
        coordinates: zoneData.coordinates,
        center: zoneData.center,
        radius_km: zoneData.radiusKm,
        pricing: zoneData.pricing,
        is_active: zoneData.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenant!.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Zone not found' });
    }

    res.json({
      success: true,
      data: { zone: data }
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
 * DELETE /api/v1/zones/:id
 * Supprime une zone
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('pricing_zones')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id);

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({ success: true });
});

/**
 * POST /api/v1/zones/check
 * Vérifie dans quelle zone se trouve un point
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = checkZoneSchema.parse(req.body);

    const { data: zones } = await supabase
      .from('pricing_zones')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('is_active', true);

    const matchingZones = (zones || []).filter(zone => {
      if (zone.type === 'circle' && zone.center) {
        const distance = calculateDistance(lat, lng, zone.center.lat, zone.center.lng);
        return distance <= (zone.radius_km || 0);
      }
      if (zone.type === 'polygon' && zone.coordinates) {
        return isPointInPolygon({ lat, lng }, zone.coordinates);
      }
      return false;
    });

    res.json({
      success: true,
      data: {
        point: { lat, lng },
        zones: matchingZones.map(z => ({
          id: z.id,
          name: z.name,
          type: z.type,
          pricing: z.pricing
        }))
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

// ==================== ROUTES À PRIX FIXE ====================

/**
 * GET /api/v1/zones/fixed-routes
 * Liste toutes les routes à prix fixe
 */
router.get('/fixed-routes', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('fixed_price_routes')
    .select('*')
    .eq('tenant_id', req.tenant!.id)
    .order('name');

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({
    success: true,
    data: { routes: data || [] }
  });
});

/**
 * POST /api/v1/zones/fixed-routes
 * Crée une route à prix fixe
 */
router.post('/fixed-routes', async (req: Request, res: Response) => {
  try {
    const routeData = fixedRouteSchema.parse(req.body);

    // Vérifier les limites
    const { data: existingRoutes } = await supabase
      .from('fixed_price_routes')
      .select('id')
      .eq('tenant_id', req.tenant!.id);
    
    const limitCheck = checkLimit(req.tenant!.plan, 'maxFixedRoutes', existingRoutes?.length || 0);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `Your plan allows a maximum of ${limitCheck.limit} fixed routes.`,
        limit: limitCheck.limit
      });
    }

    const { data, error } = await supabase
      .from('fixed_price_routes')
      .insert({
        tenant_id: req.tenant!.id,
        name: routeData.name,
        origin_name: routeData.origin.name,
        origin_lat: routeData.origin.lat,
        origin_lng: routeData.origin.lng,
        origin_radius_km: routeData.origin.radiusKm,
        destination_name: routeData.destination.name,
        destination_lat: routeData.destination.lat,
        destination_lng: routeData.destination.lng,
        destination_radius_km: routeData.destination.radiusKm,
        prices: routeData.prices,
        bidirectional: routeData.bidirectional,
        is_active: routeData.isActive
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
    }

    res.status(201).json({
      success: true,
      data: { route: data }
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
 * POST /api/v1/zones/fixed-routes/check
 * Vérifie si un trajet correspond à une route à prix fixe
 */
router.post('/fixed-routes/check', async (req: Request, res: Response) => {
  try {
    const { origin, destination } = checkRouteSchema.parse(req.body);

    const { data: routes } = await supabase
      .from('fixed_price_routes')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('is_active', true);

    let matchingRoute = null;
    let reversed = false;

    for (const route of routes || []) {
      // Vérifier dans le sens normal
      const originMatch = calculateDistance(
        origin.lat, origin.lng,
        route.origin_lat, route.origin_lng
      ) <= route.origin_radius_km;
      
      const destMatch = calculateDistance(
        destination.lat, destination.lng,
        route.destination_lat, route.destination_lng
      ) <= route.destination_radius_km;

      if (originMatch && destMatch) {
        matchingRoute = route;
        break;
      }

      // Vérifier dans le sens inverse si bidirectionnel
      if (route.bidirectional) {
        const reverseOriginMatch = calculateDistance(
          origin.lat, origin.lng,
          route.destination_lat, route.destination_lng
        ) <= route.destination_radius_km;
        
        const reverseDestMatch = calculateDistance(
          destination.lat, destination.lng,
          route.origin_lat, route.origin_lng
        ) <= route.origin_radius_km;

        if (reverseOriginMatch && reverseDestMatch) {
          matchingRoute = route;
          reversed = true;
          break;
        }
      }
    }

    if (matchingRoute) {
      res.json({
        success: true,
        data: {
          found: true,
          route: {
            id: matchingRoute.id,
            name: matchingRoute.name,
            origin: reversed ? matchingRoute.destination_name : matchingRoute.origin_name,
            destination: reversed ? matchingRoute.origin_name : matchingRoute.destination_name,
            prices: matchingRoute.prices,
            reversed
          }
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          found: false,
          message: 'No fixed-price route matches this journey'
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
 * DELETE /api/v1/zones/fixed-routes/:id
 */
router.delete('/fixed-routes/:id', async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('fixed_price_routes')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id);

  if (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }

  res.json({ success: true });
});

export default router;
