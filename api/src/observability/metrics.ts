// prom-client metrics for http, socket and domain events
import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// http metrics
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
registry.registerMetric(httpRequests);
registry.registerMetric(httpDuration);

function normalizeRouteFromParts(baseUrl: string, routePath: string | undefined, fallbackPath: string): string {
  let full = (baseUrl || '') + (routePath || '');
  if (!full) full = fallbackPath || '/unknown';
  // express style :id or :id(regex)
  full = full.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?/g, '{$1}');
  // common dynamic segments -> placeholders
  full = full.replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/{id}');         // mongo ObjectId
  full = full.replace(/\/[0-9a-fA-F-]{36}(?=\/|$)/g, '/{id}');        // uuid-like
  full = full.replace(/\/\d+(?=\/|$)/g, '/{num}');                    // numbers
  return full;
}

export function httpMetrics(req: any, res: any, next: any) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = normalizeRouteFromParts(req.baseUrl, req.route && req.route.path, req.path || req.originalUrl || '/unknown');
    const labels = { method: req.method, route, status_code: String(res.statusCode) } as any;
    httpRequests.inc(labels);
    const end = process.hrtime.bigint();
    const sec = Number(end - start) / 1e9;
    httpDuration.observe(labels, sec);
  });
  next();
}

// socket metrics
const socketConnections = new client.Gauge({
  name: 'socket_connections',
  help: 'Current socket.io connections',
});
registry.registerMetric(socketConnections);
export const sockets = {
  inc() { socketConnections.inc(); },
  dec() { socketConnections.dec(); },
};

// domain metrics
const alertsEmitted = new client.Counter({ name: 'alerts_emitted_total', help: 'Alerts emitted' });
const readingsInserted = new client.Counter({ name: 'readings_inserted_total', help: 'Readings inserted' });
registry.registerMetric(alertsEmitted);
registry.registerMetric(readingsInserted);

export const domain = {
  alertEmitted() { alertsEmitted.inc(); },
  readingsInserted(n: number) { readingsInserted.inc(n); },
};
