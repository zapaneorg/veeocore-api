/**
 * Routes API - Analytics et statistiques
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { isFeatureAllowed } from '../lib/plan-limits';
import { metrics } from '../lib/metrics';

const router = Router();

// Schémas de validation
const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).optional().default('month')
});

/**
 * Middleware: Vérifier si analytics est activé pour ce plan
 */
function checkAnalyticsFeature(req: Request, res: Response, next: Function) {
  if (!isFeatureAllowed(req.tenant!.plan, 'analytics')) {
    return res.status(403).json({
      error: 'FEATURE_NOT_AVAILABLE',
      message: 'Analytics is not available on your plan. Please upgrade to Pro or Enterprise.',
      requiredPlan: 'pro'
    });
  }
  next();
}

/**
 * Helper: Calculer les dates selon la période
 */
function getDateRange(period: string, from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date();
  let fromDate: Date;
  let toDate = to ? new Date(to) : now;

  switch (period) {
    case 'today':
      fromDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { from: fromDate, to: toDate };
}

/**
 * GET /api/v1/analytics/overview
 * Aperçu général des métriques
 */
router.get('/overview', checkAnalyticsFeature, async (req: Request, res: Response) => {
  const tenantId = req.tenant!.id;
  const { period } = dateRangeSchema.parse(req.query);
  const { from, to } = getDateRange(period as string);

  // Requêtes en parallèle pour les stats
  const [
    bookingsResult,
    revenueResult,
    driversResult,
    avgBookingResult
  ] = await Promise.all([
    // Total réservations
    supabase
      .from('tenant_bookings')
      .select('id, status', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString()),
    
    // Revenu total
    supabase
      .from('tenant_bookings')
      .select('final_price')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString()),
    
    // Chauffeurs actifs
    supabase
      .from('drivers')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    
    // Réservation moyenne
    supabase
      .from('tenant_bookings')
      .select('final_price, estimated_distance')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
  ]);

  // Calculs
  const totalBookings = bookingsResult.count || 0;
  const completedBookings = (bookingsResult.data || []).filter(b => b.status === 'completed').length;
  const cancelledBookings = (bookingsResult.data || []).filter(b => b.status === 'cancelled').length;
  
  const totalRevenue = (revenueResult.data || []).reduce((sum, b) => sum + (b.final_price || 0), 0);
  const activeDrivers = driversResult.count || 0;
  
  const avgBookings = avgBookingResult.data || [];
  const avgPrice = avgBookings.length > 0 
    ? avgBookings.reduce((sum, b) => sum + (b.final_price || 0), 0) / avgBookings.length 
    : 0;
  const avgDistance = avgBookings.length > 0 
    ? avgBookings.reduce((sum, b) => sum + (b.estimated_distance || 0), 0) / avgBookings.length 
    : 0;

  const completionRate = totalBookings > 0 
    ? Math.round((completedBookings / totalBookings) * 100) 
    : 0;

  res.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      overview: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        completionRate,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgBookingPrice: Math.round(avgPrice * 100) / 100,
        avgDistance: Math.round(avgDistance * 100) / 100,
        activeDrivers
      }
    }
  });
});

/**
 * GET /api/v1/analytics/bookings
 * Statistiques détaillées des réservations
 */
router.get('/bookings', checkAnalyticsFeature, async (req: Request, res: Response) => {
  const tenantId = req.tenant!.id;
  const { period, from: customFrom, to: customTo } = dateRangeSchema.parse(req.query);
  const { from, to } = getDateRange(period as string, customFrom, customTo);

  const { data: bookings } = await supabase
    .from('tenant_bookings')
    .select('created_at, status, vehicle_type, final_price, estimated_distance')
    .eq('tenant_id', tenantId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: true });

  // Grouper par jour
  const byDay: Record<string, { count: number; revenue: number; completed: number }> = {};
  const byStatus: Record<string, number> = {};
  const byVehicle: Record<string, { count: number; revenue: number }> = {};
  
  for (const booking of bookings || []) {
    const day = booking.created_at.split('T')[0];
    
    if (!byDay[day]) {
      byDay[day] = { count: 0, revenue: 0, completed: 0 };
    }
    byDay[day].count++;
    if (booking.status === 'completed') {
      byDay[day].completed++;
      byDay[day].revenue += booking.final_price || 0;
    }
    
    byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
    
    const vType = booking.vehicle_type || 'unknown';
    if (!byVehicle[vType]) {
      byVehicle[vType] = { count: 0, revenue: 0 };
    }
    byVehicle[vType].count++;
    if (booking.status === 'completed') {
      byVehicle[vType].revenue += booking.final_price || 0;
    }
  }

  // Convertir en tableau trié
  const dailyStats = Object.entries(byDay)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      total: bookings?.length || 0,
      byStatus,
      byVehicleType: byVehicle,
      dailyStats
    }
  });
});

/**
 * GET /api/v1/analytics/drivers
 * Statistiques des chauffeurs
 */
router.get('/drivers', checkAnalyticsFeature, async (req: Request, res: Response) => {
  const tenantId = req.tenant!.id;
  const { period } = dateRangeSchema.parse(req.query);
  const { from, to } = getDateRange(period as string);

  // Chauffeurs avec leurs stats
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, status, rating, total_rides, vehicle_type')
    .eq('tenant_id', tenantId);

  // Réservations par chauffeur dans la période
  const { data: bookings } = await supabase
    .from('tenant_bookings')
    .select('driver_id, status, final_price')
    .eq('tenant_id', tenantId)
    .not('driver_id', 'is', null)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  // Agréger les stats par chauffeur
  const driverStats: Record<string, { rides: number; revenue: number; completed: number }> = {};
  
  for (const booking of bookings || []) {
    if (!booking.driver_id) continue;
    
    if (!driverStats[booking.driver_id]) {
      driverStats[booking.driver_id] = { rides: 0, revenue: 0, completed: 0 };
    }
    driverStats[booking.driver_id].rides++;
    if (booking.status === 'completed') {
      driverStats[booking.driver_id].completed++;
      driverStats[booking.driver_id].revenue += booking.final_price || 0;
    }
  }

  // Top chauffeurs
  const topDrivers = (drivers || [])
    .map(d => ({
      id: d.id,
      name: `${d.first_name} ${d.last_name}`,
      status: d.status,
      rating: d.rating,
      vehicleType: d.vehicle_type,
      periodStats: driverStats[d.id] || { rides: 0, revenue: 0, completed: 0 }
    }))
    .sort((a, b) => b.periodStats.revenue - a.periodStats.revenue)
    .slice(0, 10);

  // Stats globales
  const totalDrivers = drivers?.length || 0;
  const activeDrivers = (drivers || []).filter(d => d.status === 'available').length;
  const avgRating = totalDrivers > 0
    ? (drivers || []).reduce((sum, d) => sum + (d.rating || 0), 0) / totalDrivers
    : 0;

  res.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalDrivers,
        activeDrivers,
        busyDrivers: (drivers || []).filter(d => d.status === 'busy').length,
        offlineDrivers: (drivers || []).filter(d => d.status === 'offline').length,
        averageRating: Math.round(avgRating * 100) / 100
      },
      topDrivers
    }
  });
});

/**
 * GET /api/v1/analytics/revenue
 * Analyse des revenus
 */
router.get('/revenue', checkAnalyticsFeature, async (req: Request, res: Response) => {
  const tenantId = req.tenant!.id;
  const { period } = dateRangeSchema.parse(req.query);
  const { from, to } = getDateRange(period as string);

  const { data: bookings } = await supabase
    .from('tenant_bookings')
    .select('created_at, final_price, vehicle_type, payment_method')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: true });

  // Par jour
  const byDay: Record<string, number> = {};
  const byVehicle: Record<string, number> = {};
  const byPayment: Record<string, number> = {};
  
  let totalRevenue = 0;
  
  for (const booking of bookings || []) {
    const price = booking.final_price || 0;
    totalRevenue += price;
    
    const day = booking.created_at.split('T')[0];
    byDay[day] = (byDay[day] || 0) + price;
    
    const vType = booking.vehicle_type || 'unknown';
    byVehicle[vType] = (byVehicle[vType] || 0) + price;
    
    const payment = booking.payment_method || 'unknown';
    byPayment[payment] = (byPayment[payment] || 0) + price;
  }

  // Tendance journalière
  const dailyRevenue = Object.entries(byDay)
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calcul de la tendance
  const revenueValues = dailyRevenue.map(d => d.amount);
  const avgDaily = revenueValues.length > 0 
    ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length 
    : 0;

  res.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageDaily: Math.round(avgDaily * 100) / 100,
        totalBookings: bookings?.length || 0,
        averagePerBooking: bookings?.length 
          ? Math.round((totalRevenue / bookings.length) * 100) / 100 
          : 0
      },
      byVehicleType: Object.fromEntries(
        Object.entries(byVehicle).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      byPaymentMethod: Object.fromEntries(
        Object.entries(byPayment).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      dailyRevenue
    }
  });
});

/**
 * GET /api/v1/analytics/zones
 * Analyse géographique des courses
 */
router.get('/zones', checkAnalyticsFeature, async (req: Request, res: Response) => {
  const tenantId = req.tenant!.id;
  const { period } = dateRangeSchema.parse(req.query);
  const { from, to } = getDateRange(period as string);

  const { data: bookings } = await supabase
    .from('tenant_bookings')
    .select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, final_price')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  // Créer une heatmap simplifiée (grille de 0.1 degré)
  const pickupHeatmap: Record<string, number> = {};
  const dropoffHeatmap: Record<string, number> = {};
  
  for (const booking of bookings || []) {
    if (booking.pickup_lat && booking.pickup_lng) {
      const pickupKey = `${Math.round(booking.pickup_lat * 10) / 10},${Math.round(booking.pickup_lng * 10) / 10}`;
      pickupHeatmap[pickupKey] = (pickupHeatmap[pickupKey] || 0) + 1;
    }
    if (booking.dropoff_lat && booking.dropoff_lng) {
      const dropoffKey = `${Math.round(booking.dropoff_lat * 10) / 10},${Math.round(booking.dropoff_lng * 10) / 10}`;
      dropoffHeatmap[dropoffKey] = (dropoffHeatmap[dropoffKey] || 0) + 1;
    }
  }

  // Top zones de départ
  const topPickups = Object.entries(pickupHeatmap)
    .map(([coords, count]) => {
      const [lat, lng] = coords.split(',').map(Number);
      return { lat, lng, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top zones d'arrivée
  const topDropoffs = Object.entries(dropoffHeatmap)
    .map(([coords, count]) => {
      const [lat, lng] = coords.split(',').map(Number);
      return { lat, lng, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalTrips: bookings?.length || 0,
      topPickupZones: topPickups,
      topDropoffZones: topDropoffs
    }
  });
});

/**
 * GET /api/v1/analytics/api-usage
 * Statistiques d'utilisation de l'API (pour le tenant courant)
 */
router.get('/api-usage', async (req: Request, res: Response) => {
  // Cette route ne nécessite pas le feature analytics - tous peuvent voir leur usage
  const tenantId = req.tenant!.id;
  
  // Récupérer les métriques depuis notre collecteur
  const apiMetrics = metrics.getMetrics();
  
  // Filtrer pour ce tenant
  const tenantRequests = apiMetrics.requests.byTenant[tenantId] || 0;
  
  res.json({
    success: true,
    data: {
      tenant: req.tenant!.name,
      plan: req.tenant!.plan,
      usage: {
        totalRequests: tenantRequests,
        // TODO: Ajouter un tracking plus détaillé par tenant
      },
      apiHealth: {
        uptime: apiMetrics.uptime,
        avgLatency: Math.round(apiMetrics.latency.avg * 100) / 100
      }
    }
  });
});

export default router;
