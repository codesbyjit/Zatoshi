import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Registry & Default Metrics
// ---------------------------------------------------------------------------

const register = new client.Registry();

client.collectDefaultMetrics({ register });

// ---------------------------------------------------------------------------
// HTTP Metrics
// ---------------------------------------------------------------------------

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [register],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestSizeBytes = new client.Summary({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'] as const,
  registers: [register],
});

export const httpResponseSizeBytes = new client.Summary({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// Business Metrics
// ---------------------------------------------------------------------------

export const ordersTotal = new client.Counter({
  name: 'orders_total',
  help: 'Total number of orders placed',
  labelNames: ['status'] as const,
  registers: [register],
});

export const revenueTotal = new client.Counter({
  name: 'revenue_total',
  help: 'Total revenue in cents',
  labelNames: ['currency'] as const,
  registers: [register],
});

export const activeUsersGauge = new client.Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
  registers: [register],
});

export const productsTotal = new client.Gauge({
  name: 'products_total',
  help: 'Total number of products in catalog',
  labelNames: ['category'] as const,
  registers: [register],
});

export const orderProcessingDuration = new client.Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Time taken to process an order',
  labelNames: ['status'] as const,
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const dbQueryDurationHistogram = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'collection'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const cacheHitCounter = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache'] as const,
  registers: [register],
});

export const cacheMissCounter = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache'] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// Helper functions for business metrics
// ---------------------------------------------------------------------------

export function incrementOrder(status: string = 'completed'): void {
  ordersTotal.inc({ status });
}

export function incrementRevenue(
  cents: number,
  currency: string = 'USD',
): void {
  revenueTotal.inc({ currency }, cents);
}

export function setActiveUsers(count: number): void {
  activeUsersGauge.set(count);
}

export function setProductsTotal(count: number, category?: string): void {
  if (category) {
    productsTotal.set({ category }, count);
  } else {
    productsTotal.set(count);
  }
}

export function observeOrderProcessing(
  seconds: number,
  status: string = 'completed',
): void {
  orderProcessingDuration.observe({ status }, seconds);
}

export function observeDbQuery(
  seconds: number,
  operation: string,
  collection: string,
): void {
  dbQueryDurationHistogram.observe({ operation, collection }, seconds);
}

export function incrementCacheHit(cache: string = 'redis'): void {
  cacheHitCounter.inc({ cache });
}

export function incrementCacheMiss(cache: string = 'redis'): void {
  cacheMissCounter.inc({ cache });
}

// ---------------------------------------------------------------------------
// Express Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that exposes /metrics for Prometheus scraping.
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.setHeader('Content-Type', register.contentType);
    register.metrics().then((data) => {
      res.status(200).send(data);
    }).catch((err) => {
      res.status(500).send(err.message);
    });
    return;
  }
  next();
}

/**
 * Express middleware that instruments every HTTP request.
 * It increments the request counter and records duration in the histogram.
 * Must be registered BEFORE route handlers.
 */
export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const method = req.method;
  // Capture the route pattern if available (set by express after routing)
  let route = req.route?.path || req.originalUrl || req.url || 'unknown';

  // Normalize route to avoid unbounded label values
  route = route.replace(/\/\d+/g, '/:id');

  const end = res.end.bind(res);
  res.end = function (...args: Parameters<typeof end>): Response {
    const duration = (Date.now() - startTime) / 1000;
    const status = String(res.statusCode);

    httpRequestCounter.inc({ method, route, status });
    httpRequestDurationHistogram.observe({ method, route, status }, duration);

    return end(...args);
  } as typeof res.end;

  next();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { register };
export default {
  register,
  httpRequestCounter,
  httpRequestDurationHistogram,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  ordersTotal,
  revenueTotal,
  activeUsersGauge,
  productsTotal,
  orderProcessingDuration,
  dbQueryDurationHistogram,
  cacheHitCounter,
  cacheMissCounter,
  metricsMiddleware,
  httpMetricsMiddleware,
  incrementOrder,
  incrementRevenue,
  setActiveUsers,
  setProductsTotal,
  observeOrderProcessing,
  observeDbQuery,
  incrementCacheHit,
  incrementCacheMiss,
};
