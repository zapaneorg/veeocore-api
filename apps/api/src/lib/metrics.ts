/**
 * Métriques et monitoring - Statistiques temps réel
 */

interface Metric {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
}

interface ApiMetrics {
  requests: {
    total: number;
    byEndpoint: Record<string, number>;
    byStatusCode: Record<string, number>;
    byTenant: Record<string, number>;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    samples: number[];
  };
  pricing: {
    calculations: number;
    avgCalculationTime: number;
    calculationTimes: number[];
  };
  bookings: {
    created: number;
    completed: number;
    cancelled: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  startTime: Date;
}

class MetricsCollector {
  private metrics: ApiMetrics = {
    requests: {
      total: 0,
      byEndpoint: {},
      byStatusCode: {},
      byTenant: {}
    },
    latency: {
      avg: 0,
      min: Infinity,
      max: 0,
      p95: 0,
      samples: []
    },
    pricing: {
      calculations: 0,
      avgCalculationTime: 0,
      calculationTimes: []
    },
    bookings: {
      created: 0,
      completed: 0,
      cancelled: 0
    },
    errors: {
      total: 0,
      byType: {}
    },
    startTime: new Date()
  };

  private maxSamples = 1000;

  recordRequest(endpoint: string, statusCode: number, tenantId?: string, latencyMs?: number): void {
    this.metrics.requests.total++;
    
    // Par endpoint
    const normalizedEndpoint = endpoint.replace(/\/[a-f0-9-]{36}/gi, '/:id');
    this.metrics.requests.byEndpoint[normalizedEndpoint] = 
      (this.metrics.requests.byEndpoint[normalizedEndpoint] || 0) + 1;
    
    // Par status code
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    this.metrics.requests.byStatusCode[statusGroup] = 
      (this.metrics.requests.byStatusCode[statusGroup] || 0) + 1;
    
    // Par tenant
    if (tenantId) {
      this.metrics.requests.byTenant[tenantId] = 
        (this.metrics.requests.byTenant[tenantId] || 0) + 1;
    }
    
    // Latence
    if (latencyMs !== undefined) {
      this.metrics.latency.samples.push(latencyMs);
      if (this.metrics.latency.samples.length > this.maxSamples) {
        this.metrics.latency.samples.shift();
      }
      this.updateLatencyStats();
    }
  }

  recordPricingCalculation(calculationTimeMs: number): void {
    this.metrics.pricing.calculations++;
    this.metrics.pricing.calculationTimes.push(calculationTimeMs);
    if (this.metrics.pricing.calculationTimes.length > this.maxSamples) {
      this.metrics.pricing.calculationTimes.shift();
    }
    const times = this.metrics.pricing.calculationTimes;
    this.metrics.pricing.avgCalculationTime = times.reduce((a, b) => a + b, 0) / times.length;
  }

  recordBooking(event: 'created' | 'completed' | 'cancelled'): void {
    this.metrics.bookings[event]++;
  }

  recordError(errorType: string): void {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  private updateLatencyStats(): void {
    const samples = this.metrics.latency.samples;
    if (samples.length === 0) return;
    
    const sorted = [...samples].sort((a, b) => a - b);
    this.metrics.latency.min = sorted[0];
    this.metrics.latency.max = sorted[sorted.length - 1];
    this.metrics.latency.avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    this.metrics.latency.p95 = sorted[Math.floor(sorted.length * 0.95)];
  }

  getMetrics(): ApiMetrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime.getTime()
    };
  }

  getPrometheusFormat(): string {
    const m = this.metrics;
    const lines: string[] = [];
    
    lines.push('# HELP veeocore_requests_total Total number of API requests');
    lines.push('# TYPE veeocore_requests_total counter');
    lines.push(`veeocore_requests_total ${m.requests.total}`);
    
    lines.push('# HELP veeocore_request_latency_ms Request latency in milliseconds');
    lines.push('# TYPE veeocore_request_latency_ms gauge');
    lines.push(`veeocore_request_latency_avg_ms ${m.latency.avg.toFixed(2)}`);
    lines.push(`veeocore_request_latency_p95_ms ${m.latency.p95.toFixed(2)}`);
    
    lines.push('# HELP veeocore_pricing_calculations_total Total pricing calculations');
    lines.push('# TYPE veeocore_pricing_calculations_total counter');
    lines.push(`veeocore_pricing_calculations_total ${m.pricing.calculations}`);
    
    lines.push('# HELP veeocore_bookings_total Bookings by status');
    lines.push('# TYPE veeocore_bookings_total counter');
    lines.push(`veeocore_bookings_created_total ${m.bookings.created}`);
    lines.push(`veeocore_bookings_completed_total ${m.bookings.completed}`);
    lines.push(`veeocore_bookings_cancelled_total ${m.bookings.cancelled}`);
    
    lines.push('# HELP veeocore_errors_total Total errors');
    lines.push('# TYPE veeocore_errors_total counter');
    lines.push(`veeocore_errors_total ${m.errors.total}`);
    
    return lines.join('\n');
  }

  reset(): void {
    this.metrics = {
      requests: { total: 0, byEndpoint: {}, byStatusCode: {}, byTenant: {} },
      latency: { avg: 0, min: Infinity, max: 0, p95: 0, samples: [] },
      pricing: { calculations: 0, avgCalculationTime: 0, calculationTimes: [] },
      bookings: { created: 0, completed: 0, cancelled: 0 },
      errors: { total: 0, byType: {} },
      startTime: new Date()
    };
  }
}

export const metrics = new MetricsCollector();
export default metrics;
