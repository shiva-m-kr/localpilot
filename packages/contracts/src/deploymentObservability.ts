import { z } from 'zod';

export const HealthCheckStatusSchema = z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY']);
export type HealthCheckStatus = z.infer<typeof HealthCheckStatusSchema>;

export const SystemHealthOverviewSchema = z.object({
  status: HealthCheckStatusSchema,
  uptimeSeconds: z.number().min(0),
  environment: z.enum(['STAGING', 'PRODUCTION', 'TEST']),
  database: z.object({
    status: HealthCheckStatusSchema,
    activeConnections: z.number().int().min(0),
    latencyMs: z.number().min(0),
  }),
  workerQueues: z.object({
    status: HealthCheckStatusSchema,
    activeWorkersCount: z.number().int().min(0),
    oldestPendingJobAgeSeconds: z.number().min(0),
    deadLetterQueueCount: z.number().int().min(0),
  }),
  killSwitchState: z.object({
    isGlobalExternalWritesPaused: z.boolean(),
    activePausedLocationCount: z.number().int().min(0),
  }),
  alerts: z.array(z.string()),
  timestamp: z.string().datetime(),
});
export type SystemHealthOverview = z.infer<typeof SystemHealthOverviewSchema>;

export const RestoreDrillReportSchema = z.object({
  drillId: z.string().uuid(),
  executedAt: z.string().datetime(),
  simulatedDataLossScenario: z.string(),
  rpoObservedHours: z.number().min(0),
  rpoTargetHours: z.number().default(24),
  rtoObservedHours: z.number().min(0),
  rtoTargetHours: z.number().default(8),
  isRpoRtoAchieved: z.boolean(),
  deduplicationAsserted: z.boolean(),
  secretsDecryptionAsserted: z.boolean(),
  expiredTtlSourcePurged: z.boolean(),
  auditNotes: z.string(),
});
export type RestoreDrillReport = z.infer<typeof RestoreDrillReportSchema>;
