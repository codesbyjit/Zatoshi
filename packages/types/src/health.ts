import { z } from 'zod';

export const HealthCheckEntrySchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  latency: z.number(),
  lastChecked: z.string().datetime(),
  error: z.string().optional(),
});

export type HealthCheckEntry = z.infer<typeof HealthCheckEntrySchema>;

export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.string().datetime(),
  checks: z.record(HealthCheckEntrySchema),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ReadinessStatusSchema = z.object({
  ready: z.boolean(),
  checks: z.record(
    z.object({
      reachable: z.boolean(),
      latency: z.number(),
      error: z.string().optional(),
    }),
  ),
});

export type ReadinessStatus = z.infer<typeof ReadinessStatusSchema>;
