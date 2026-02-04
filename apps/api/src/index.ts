/**
 * VeeoCore API - Point d'entrée principal
 * Version 1.3.0 - Avec WebSocket temps réel
 */

// Charger les variables d'environnement EN PREMIER
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

import { errorHandler } from './middleware/error-handler';
import { apiKeyAuth, jwtAuth } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limiter';
import { planRateLimiter, metricsMiddleware } from './middleware/advanced-security';
import logger from './lib/logger';
import { metrics } from './lib/metrics';
import { wsManager } from './lib/websocket';

// Routes
import pricingRoutes from './routes/pricing';
import driversRoutes from './routes/drivers';
import bookingsRoutes from './routes/bookings';
import paymentsRoutes from './routes/payments';
import tenantsRoutes from './routes/tenants';
import webhooksRoutes from './routes/webhooks';
import geoRoutes from './routes/geo';
import zonesRoutes from './routes/zones';
import dispatchRoutes from './routes/dispatch';
import analyticsRoutes from './routes/analytics';
import stripeWebhooksRoutes from './routes/stripe-webhooks';

// Routes Tenant Admin & Driver
import tenantAuthRoutes from './routes/tenant-auth';
import tenantDashboardRoutes from './routes/tenant-dashboard';
import driverAuthRoutes from './routes/driver-auth';
import driverApiRoutes from './routes/driver-api';
import installRoutes from './routes/install';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialiser WebSocket
wsManager.initialize(httpServer);

// Middleware de base
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Rate limiting global + métriques
app.use(rateLimiter);
app.use(metricsMiddleware);

// Servir les fichiers statiques de la page DEMO
const demoPath = path.resolve(__dirname, '../demo');
app.use('/demo', express.static(demoPath));

// Page d'accueil (public)
app.get('/', (req, res) => {
  res.json({
    name: 'VeeoCore API',
    version: '1.2.0',
    status: 'running',
    documentation: '/api/docs',
    demo: '/demo',
    admin: '/demo/admin.html',
    health: '/health'
  });
});

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'VeeoCore API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      pricing: '/api/v1/pricing',
      drivers: '/api/v1/drivers',
      bookings: '/api/v1/bookings',
      tenants: '/api/v1/tenants',
      webhooks: '/api/v1/webhooks'
    }
  });
});

// API Docs (OpenAPI style)
app.get('/api/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'VeeoCore API',
      version: '1.0.0',
      description: 'API de calcul de prix et gestion de réservations VTC',
      contact: { email: 'api@veeo-stras.fr' }
    },
    servers: [{ url: 'https://api-core.veeo-stras.fr' }],
    paths: {
      '/api/v1/pricing/quote': {
        post: {
          summary: 'Calculer un prix',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['distanceKm', 'durationMin', 'vehicleType'],
                  properties: {
                    distanceKm: { type: 'number', example: 15.2 },
                    durationMin: { type: 'number', example: 22 },
                    vehicleType: { type: 'string', enum: ['standard', 'premium', 'van'] }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Prix calculé avec succès' },
            '401': { description: 'Clé API invalide' }
          }
        }
      },
      '/api/v1/pricing/calculate': {
        post: { summary: 'Calculer tous les prix', security: [{ ApiKeyAuth: [] }] }
      },
      '/api/v1/bookings': {
        get: { summary: 'Lister les réservations', security: [{ ApiKeyAuth: [] }] },
        post: { summary: 'Créer une réservation', security: [{ ApiKeyAuth: [] }] }
      },
      '/api/v1/bookings/{id}': {
        get: { summary: 'Détails d\'une réservation', security: [{ ApiKeyAuth: [] }] }
      },
      '/api/v1/drivers': {
        get: { summary: 'Lister les chauffeurs', security: [{ ApiKeyAuth: [] }] },
        post: { summary: 'Créer un chauffeur', security: [{ ApiKeyAuth: [] }] }
      },
      '/api/v1/drivers/available': {
        get: { summary: 'Chauffeurs disponibles', security: [{ ApiKeyAuth: [] }] }
      }
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      }
    }
  });
});

// Routes API v1 (protégées par API Key)
app.use('/api/v1/pricing', apiKeyAuth, planRateLimiter, pricingRoutes);
app.use('/api/v1/drivers', apiKeyAuth, planRateLimiter, driversRoutes);
app.use('/api/v1/bookings', apiKeyAuth, planRateLimiter, bookingsRoutes);
app.use('/api/v1/payments', apiKeyAuth, planRateLimiter, paymentsRoutes);
app.use('/api/v1/geo', apiKeyAuth, planRateLimiter, geoRoutes);
app.use('/api/v1/zones', apiKeyAuth, planRateLimiter, zonesRoutes);
app.use('/api/v1/dispatch', apiKeyAuth, planRateLimiter, dispatchRoutes);
app.use('/api/v1/analytics', apiKeyAuth, planRateLimiter, analyticsRoutes);

// Routes Admin (protégées par JWT)
app.use('/api/v1/tenants', jwtAuth, tenantsRoutes);

// Webhooks (signature vérifiée)
app.use('/api/v1/webhooks', webhooksRoutes);

// Routes Tenant Admin (authentification propre)
app.use('/api/v1/auth/tenant', tenantAuthRoutes);
app.use('/api/v1/tenant', tenantDashboardRoutes);

// Routes Driver App (authentification chauffeur)
app.use('/api/v1/auth/driver', driverAuthRoutes);
app.use('/api/v1/driver', driverApiRoutes);

// Stripe Webhooks (raw body pour signature)
app.use('/api/v1/stripe', stripeWebhooksRoutes);

// Routes d'installation (publiques)
app.use('/install', installRoutes);

// WebSocket stats endpoint
app.get('/ws/stats', (req, res) => {
  res.json(wsManager.getStats());
});

// Métriques (pour monitoring)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.getPrometheusFormat());
});

app.get('/metrics/json', (req, res) => {
  res.json(metrics.getMetrics());
});

// Error handler
app.use(errorHandler);

// Start server with WebSocket support
httpServer.listen(PORT, () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV });
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           VeeoCore API Server v1.3.0                       ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running on http://localhost:${PORT}
📚 API Documentation: http://localhost:${PORT}/api/docs
📊 Metrics: http://localhost:${PORT}/metrics
🔌 WebSocket: ws://localhost:${PORT}

New Features:
  • /api/v1/geo       - Géocodage & ETA
  • /api/v1/zones     - Zones de tarification
  • /api/v1/dispatch  - Dispatch automatique
  • /api/v1/analytics - Statistiques
  • /api/v1/stripe    - Stripe Webhooks
  • WebSocket         - Notifications temps réel

Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

export { wsManager };
export default app;
