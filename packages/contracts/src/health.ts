import { z } from 'zod';

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  environment: z.string(),
  uptimeSeconds: z.number(),
  checks: z.record(z.object({
    status: z.enum(['ok', 'warn', 'fail']),
    message: z.string().optional(),
    latencyMs: z.number().optional()
  }))
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
