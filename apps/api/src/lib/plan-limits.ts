/**
 * Limites par plan - Validation des quotas et fonctionnalités
 */

export interface PlanLimits {
  // Requests
  requestsPerMinute: number;
  requestsPerDay: number;
  
  // Features
  maxDrivers: number;
  maxBookingsPerMonth: number;
  maxZones: number;
  maxFixedRoutes: number;
  
  // Capabilities
  features: {
    dispatch: boolean;
    analytics: boolean;
    webhooks: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    dedicatedServer: boolean;
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    requestsPerMinute: 10,
    requestsPerDay: 100,
    maxDrivers: 2,
    maxBookingsPerMonth: 50,
    maxZones: 1,
    maxFixedRoutes: 5,
    features: {
      dispatch: false,
      analytics: false,
      webhooks: false,
      customBranding: false,
      prioritySupport: false,
      dedicatedServer: false
    }
  },
  starter: {
    requestsPerMinute: 60,
    requestsPerDay: 5000,
    maxDrivers: 10,
    maxBookingsPerMonth: 500,
    maxZones: 5,
    maxFixedRoutes: 20,
    features: {
      dispatch: true,
      analytics: false,
      webhooks: true,
      customBranding: false,
      prioritySupport: false,
      dedicatedServer: false
    }
  },
  pro: {
    requestsPerMinute: 300,
    requestsPerDay: 50000,
    maxDrivers: 50,
    maxBookingsPerMonth: 5000,
    maxZones: 20,
    maxFixedRoutes: 100,
    features: {
      dispatch: true,
      analytics: true,
      webhooks: true,
      customBranding: true,
      prioritySupport: false,
      dedicatedServer: false
    }
  },
  enterprise: {
    requestsPerMinute: 1000,
    requestsPerDay: -1, // Illimité
    maxDrivers: -1,
    maxBookingsPerMonth: -1,
    maxZones: -1,
    maxFixedRoutes: -1,
    features: {
      dispatch: true,
      analytics: true,
      webhooks: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedServer: true
    }
  }
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function isFeatureAllowed(plan: string, feature: keyof PlanLimits['features']): boolean {
  const limits = getPlanLimits(plan);
  return limits.features[feature];
}

export function checkLimit(plan: string, resource: keyof PlanLimits, currentValue: number): {
  allowed: boolean;
  limit: number;
  remaining: number;
} {
  const limits = getPlanLimits(plan);
  const limit = limits[resource] as number;
  
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  
  return {
    allowed: currentValue < limit,
    limit,
    remaining: Math.max(0, limit - currentValue)
  };
}

// Usage tracker pour rate limiting par plan
interface UsageEntry {
  count: number;
  resetTime: number;
}

const minuteUsage = new Map<string, UsageEntry>();
const dailyUsage = new Map<string, UsageEntry>();

export function checkRateLimit(tenantId: string, plan: string): {
  allowed: boolean;
  minuteRemaining: number;
  dailyRemaining: number;
  retryAfter?: number;
} {
  const limits = getPlanLimits(plan);
  const now = Date.now();
  
  // Check minute limit
  let minuteEntry = minuteUsage.get(tenantId);
  if (!minuteEntry || now > minuteEntry.resetTime) {
    minuteEntry = { count: 0, resetTime: now + 60000 };
    minuteUsage.set(tenantId, minuteEntry);
  }
  
  // Check daily limit
  let dailyEntry = dailyUsage.get(tenantId);
  if (!dailyEntry || now > dailyEntry.resetTime) {
    dailyEntry = { count: 0, resetTime: now + 86400000 };
    dailyUsage.set(tenantId, dailyEntry);
  }
  
  const minuteRemaining = Math.max(0, limits.requestsPerMinute - minuteEntry.count);
  const dailyRemaining = limits.requestsPerDay === -1 
    ? -1 
    : Math.max(0, limits.requestsPerDay - dailyEntry.count);
  
  if (minuteEntry.count >= limits.requestsPerMinute) {
    return {
      allowed: false,
      minuteRemaining: 0,
      dailyRemaining,
      retryAfter: Math.ceil((minuteEntry.resetTime - now) / 1000)
    };
  }
  
  if (limits.requestsPerDay !== -1 && dailyEntry.count >= limits.requestsPerDay) {
    return {
      allowed: false,
      minuteRemaining,
      dailyRemaining: 0,
      retryAfter: Math.ceil((dailyEntry.resetTime - now) / 1000)
    };
  }
  
  // Increment counters
  minuteEntry.count++;
  dailyEntry.count++;
  
  return {
    allowed: true,
    minuteRemaining: minuteRemaining - 1,
    dailyRemaining: dailyRemaining === -1 ? -1 : dailyRemaining - 1
  };
}

export default { PLAN_LIMITS, getPlanLimits, isFeatureAllowed, checkLimit, checkRateLimit };
