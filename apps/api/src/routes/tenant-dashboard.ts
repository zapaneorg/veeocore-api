/**
 * Routes API - Dashboard Stats pour Tenant Admin
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/v1/tenant/stats
 * Statistiques du dashboard tenant
 */
router.get('/stats', async (req: Request, res: Response) => {
  const tenantId = req.tenant!.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Réservations aujourd'hui
    const { count: todayBookings } = await supabase
      .from('tenant_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayStart);

    // Revenus aujourd'hui
    const { data: todayRevenueData } = await supabase
      .from('tenant_bookings')
      .select('total_price')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', todayStart);
    
    const todayRevenue = todayRevenueData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

    // Chauffeurs actifs
    const { count: activeDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'available')
      .eq('is_active', true);

    // Courses en cours
    const { count: inProgressRides } = await supabase
      .from('tenant_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['assigned', 'en_route', 'arrived', 'in_progress']);

    // Réservations par statut
    const { data: bookingsByStatus } = await supabase
      .from('tenant_bookings')
      .select('status')
      .eq('tenant_id', tenantId)
      .gte('created_at', weekStart);

    const statusCounts = {
      pending: 0,
      assigned: 0,
      en_route: 0,
      arrived: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };

    bookingsByStatus?.forEach(b => {
      if (statusCounts.hasOwnProperty(b.status)) {
        statusCounts[b.status as keyof typeof statusCounts]++;
      }
    });

    // Données de la semaine (pour les graphiques)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

      const { data: dayData } = await supabase
        .from('tenant_bookings')
        .select('total_price, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd);

      const dayRevenue = dayData?.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      const dayBookings = dayData?.length || 0;

      weeklyData.push({
        date: dayStart,
        revenue: dayRevenue,
        bookings: dayBookings
      });
    }

    // Revenus par type de véhicule
    const { data: vehicleRevenue } = await supabase
      .from('tenant_bookings')
      .select('vehicle_type, total_price')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', weekStart);

    const revenueByVehicleType: Record<string, number> = {};
    vehicleRevenue?.forEach(b => {
      const type = b.vehicle_type || 'standard';
      revenueByVehicleType[type] = (revenueByVehicleType[type] || 0) + (b.total_price || 0);
    });

    res.json({
      success: true,
      data: {
        todayBookings: todayBookings || 0,
        todayRevenue,
        activeDrivers: activeDrivers || 0,
        inProgressRides: inProgressRides || 0,
        weeklyBookings: weeklyData.map(d => d.bookings),
        weeklyRevenue: weeklyData.map(d => d.revenue),
        bookingsByStatus: statusCounts,
        revenueByVehicleType
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/tenant/settings
 * Récupérer les paramètres du tenant
 */
router.get('/settings', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', req.tenant!.id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Tenant not found'
    });
  }

  res.json({
    success: true,
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      stripeConfigured: !!data.stripe_secret_key,
      webhookUrl: data.webhook_url,
      webhookEvents: data.webhook_events,
      timezone: data.timezone || 'Europe/Paris',
      currency: data.currency || 'EUR',
      createdAt: data.created_at
    }
  });
});

/**
 * PUT /api/v1/tenant/settings
 * Mettre à jour les paramètres du tenant
 */
router.put('/settings', async (req: Request, res: Response) => {
  const { name, timezone, currency, webhookUrl, webhookEvents } = req.body;

  const updates: Record<string, any> = {};
  if (name) updates.name = name;
  if (timezone) updates.timezone = timezone;
  if (currency) updates.currency = currency;
  if (webhookUrl !== undefined) updates.webhook_url = webhookUrl;
  if (webhookEvents) updates.webhook_events = webhookEvents;

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', req.tenant!.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message
    });
  }

  res.json({
    success: true,
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      stripeConfigured: !!data.stripe_secret_key,
      webhookUrl: data.webhook_url,
      webhookEvents: data.webhook_events,
      timezone: data.timezone,
      currency: data.currency
    }
  });
});

/**
 * PUT /api/v1/tenant/stripe
 * Configurer Stripe
 */
router.put('/stripe', async (req: Request, res: Response) => {
  const { publishableKey, secretKey } = req.body;

  if (!publishableKey || !secretKey) {
    return res.status(400).json({
      error: 'MISSING_KEYS',
      message: 'Les clés Stripe sont requises'
    });
  }

  // Valider le format des clés
  if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) {
    return res.status(400).json({
      error: 'INVALID_KEYS',
      message: 'Format des clés Stripe invalide'
    });
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      stripe_publishable_key: publishableKey,
      stripe_secret_key: secretKey,
      stripe_configured: true
    })
    .eq('id', req.tenant!.id);

  if (error) {
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message
    });
  }

  res.json({
    success: true,
    message: 'Configuration Stripe enregistrée'
  });
});

export default router;
