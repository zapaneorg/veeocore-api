/**
 * Middleware de sécurité avancée
 * - Rate limiting par plan
 * - Logging des requêtes
 * - Métriques
 */

import { Request, Response, NextFunction } from 'express';
import { checkRateLimit, getPlanLimits } from '../lib/plan-limits';
import logger from '../lib/logger';
import { metrics } from '../lib/metrics';

/**
 * Rate limiter par plan
 * Applique des limites différentes selon le plan du tenant
 */
export function planRateLimiter(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant) {
    return next();
  }

  const result = checkRateLimit(req.tenant.id, req.tenant.plan);
  
  // Headers de rate limiting
  const limits = getPlanLimits(req.tenant.plan);
  res.setHeader('X-RateLimit-Limit-Minute', limits.requestsPerMinute);
  res.setHeader('X-RateLimit-Remaining-Minute', result.minuteRemaining);
  res.setHeader('X-RateLimit-Limit-Day', limits.requestsPerDay === -1 ? 'unlimited' : limits.requestsPerDay);
  res.setHeader('X-RateLimit-Remaining-Day', result.dailyRemaining === -1 ? 'unlimited' : result.dailyRemaining);
  res.setHeader('X-Plan', req.tenant.plan);

  if (!result.allowed) {
    logger.warn('Rate limit exceeded', { 
      tenantId: req.tenant.id, 
      plan: req.tenant.plan,
      path: req.path
    });
    
    metrics.recordError('rate_limit');
    
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `You have exceeded your rate limit for your ${req.tenant.plan} plan.`,
      limits: {
        minuteLimit: limits.requestsPerMinute,
        dailyLimit: limits.requestsPerDay,
        minuteRemaining: result.minuteRemaining,
        dailyRemaining: result.dailyRemaining
      },
      retryAfter: result.retryAfter,
      upgrade: req.tenant.plan !== 'enterprise' 
        ? 'Consider upgrading your plan for higher limits.' 
        : undefined
    });
  }

  next();
}

/**
 * Middleware de métriques
 * Enregistre les statistiques de chaque requête
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Intercepter la fin de la requête
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    metrics.recordRequest(
      req.path,
      res.statusCode,
      req.tenant?.id,
      duration
    );

    // Log des requêtes lentes (>500ms)
    if (duration > 500) {
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        tenantId: req.tenant?.id
      });
    }
  });

  next();
}

/**
 * Middleware de logging des requêtes
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.request(
      { 
        method: req.method, 
        path: req.path, 
        tenantId: req.tenant?.id 
      },
      duration,
      res.statusCode
    );
  });

  next();
}

/**
 * Vérification des features par plan
 */
export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const limits = getPlanLimits(req.tenant.plan);
    const featureKey = feature as keyof typeof limits.features;
    
    if (!limits.features[featureKey]) {
      logger.info('Feature access denied', {
        tenantId: req.tenant.id,
        feature,
        plan: req.tenant.plan
      });
      
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        message: `The "${feature}" feature is not available on your ${req.tenant.plan} plan.`,
        currentPlan: req.tenant.plan,
        requiredPlan: getRequiredPlan(feature)
      });
    }

    next();
  };
}

function getRequiredPlan(feature: string): string {
  const featurePlans: Record<string, string> = {
    dispatch: 'starter',
    analytics: 'pro',
    webhooks: 'starter',
    customBranding: 'pro',
    prioritySupport: 'enterprise',
    dedicatedServer: 'enterprise'
  };
  return featurePlans[feature] || 'pro';
}

export default {
  planRateLimiter,
  metricsMiddleware,
  requestLogger,
  requireFeature
};
