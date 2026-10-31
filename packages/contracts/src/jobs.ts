import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const JobLaneSchema = z.enum([
  'publication',
  'reconciliation',
  'generation',
  'rankings',
  'crawl_maintenance'
]);
export type JobLane = z.infer<typeof JobLaneSchema>;

export const JobStatusSchema = z.enum([
  'queued',
  'leased',
  'running',
  'completed',
  'failed',
  'cancelled'
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobPrioritySchema = z.enum([
  'critical',
  'high',
  'normal',
  'low'
]);
export type JobPriority = z.infer<typeof JobPrioritySchema>;

export const JobDiagnosticsSchema = z.object({
  errorCode: z.string(),
  errorMessage: z.string(),
  userAction: z.string().optional(),
  failedAt: ISO8601TimestampSchema,
  isSanitized: z.literal(true).default(true),
  attemptsMade: z.number().int().nonnegative()
});
export type JobDiagnostics = z.infer<typeof JobDiagnosticsSchema>;

export const JobRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  lane: JobLaneSchema,
  jobType: z.string(),
  priority: JobPrioritySchema.default('normal'),
  status: JobStatusSchema.default('queued'),
  payload: z.record(z.unknown()),
  maxAttempts: z.number().int().min(1).default(3),
  attemptCount: z.number().int().nonnegative().default(0),
  runAt: ISO8601TimestampSchema,
  leasedAt: ISO8601TimestampSchema.optional(),
  leaseExpiresAt: ISO8601TimestampSchema.optional(),
  workerId: z.string().optional(),
  lastHeartbeatAt: ISO8601TimestampSchema.optional(),
  diagnostics: JobDiagnosticsSchema.optional(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema,
  completedAt: ISO8601TimestampSchema.optional()
});
export type JobRecord = z.infer<typeof JobRecordSchema>;

export const EnqueueJobInputSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  lane: JobLaneSchema,
  jobType: z.string(),
  payload: z.record(z.unknown()),
  priority: JobPrioritySchema.optional(),
  runAt: ISO8601TimestampSchema.optional(),
  maxAttempts: z.number().int().min(1).optional()
});
export type EnqueueJobInput = z.infer<typeof EnqueueJobInputSchema>;
