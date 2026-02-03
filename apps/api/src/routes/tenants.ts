/**
 * Routes API - Tenants (Gestion des clients SaaS)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { supabase } from '../lib/supabase';
import { adminOnly } from '../middleware/auth';

const router = Router();

// Schémas de validation
const tenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  plan: z.enum(['starter', 'pro', 'business', 'enterprise']).default('starter'),
  config: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    maxVehicles: z.number().optional(),
    customBranding: z.boolean().optional()
  }).optional()
});

/**
 * GET /api/v1/tenants
 * Liste tous les tenants (admin only)
 */
router.get('/', adminOnly, async (req: Request, res: Response) => {
  const { plan, isActive, limit = 50, offset = 0 } = req.query;
  
  let query = supabase
    .from('tenants')
    .select('id, name, slug, email, plan, is_active, created_at');
  
  if (plan) {
    query = query.eq('plan', plan);
  }
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive === 'true');
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
      tenants: data || [],
      total: count,
      limit: Number(limit),
      offset: Number(offset)
    }
  });
});

/**
 * GET /api/v1/tenants/me
 * Informations du tenant actuel
 */
router.get('/me', async (req: Request, res: Response) => {
  // Si authentifié par JWT (admin), récupérer via user
  // Sinon, retourner les infos basiques
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, email, plan, config, is_active, created_at')
    .eq('id', req.user?.id) // Assuming user.id is tenant_id for tenant admins
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Tenant not found' });
  }

  res.json({
    success: true,
    data: { tenant: data }
  });
});

/**
 * POST /api/v1/tenants
 * Crée un nouveau tenant (admin only ou signup)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantData = tenantSchema.parse(req.body);
    
    // Vérifier que le slug est unique
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantData.slug)
      .single();
    
    if (existing) {
      return res.status(400).json({ 
        error: 'SLUG_EXISTS', 
        message: 'This slug is already taken' 
      });
    }
    
    // Générer une API key
    const apiKey = `vk_${randomBytes(24).toString('hex')}`;
    
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name: tenantData.name,
        slug: tenantData.slug,
        email: tenantData.email,
        plan: tenantData.plan,
        api_key: apiKey,
        config: tenantData.config || {},
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: 'CREATE_ERROR', message: error.message });
    }

    res.status(201).json({
      success: true,
      data: { 
        tenant: {
          ...data,
          api_key: apiKey // Afficher une seule fois à la création
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid tenant data',
        details: error.errors
      });
    }
    throw error;
  }
});

/**
 * PATCH /api/v1/tenants/:id
 * Met à jour un tenant
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const updates = req.body;
  
  // Ne pas permettre de changer l'API key ou le slug via PATCH
  delete updates.api_key;
  delete updates.slug;
  
  const { data, error } = await supabase
    .from('tenants')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Tenant not found' });
  }

  res.json({
    success: true,
    data: { tenant: data }
  });
});

/**
 * POST /api/v1/tenants/:id/regenerate-key
 * Regénère l'API key d'un tenant
 */
router.post('/:id/regenerate-key', async (req: Request, res: Response) => {
  const newApiKey = `vk_${randomBytes(24).toString('hex')}`;
  
  const { data, error } = await supabase
    .from('tenants')
    .update({
      api_key: newApiKey,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'UPDATE_ERROR', message: 'Tenant not found' });
  }

  res.json({
    success: true,
    data: { 
      tenant: data,
      newApiKey // Afficher une seule fois
    },
    message: 'API key regenerated. Please update your integrations.'
  });
});

/**
 * GET /api/v1/tenants/:id/stats
 * Statistiques d'un tenant
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  const tenantId = req.params.id;
  
  // Compter les drivers
  const { count: driversCount } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  
  // Compter les bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('status, estimated_price')
    .eq('tenant_id', tenantId);
  
  const stats = {
    drivers: {
      total: driversCount || 0
    },
    bookings: {
      total: bookings?.length || 0,
      completed: bookings?.filter(b => b.status === 'completed').length || 0,
      cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
      pending: bookings?.filter(b => !['completed', 'cancelled'].includes(b.status)).length || 0
    },
    revenue: {
      total: bookings?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.estimated_price || 0), 0) || 0
    }
  };

  res.json({
    success: true,
    data: { stats }
  });
});

/**
 * DELETE /api/v1/tenants/:id
 * Désactive un tenant (admin only)
 */
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('tenants')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'DELETE_ERROR', message: 'Tenant not found' });
  }

  res.json({
    success: true,
    message: 'Tenant deactivated'
  });
});

export default router;
