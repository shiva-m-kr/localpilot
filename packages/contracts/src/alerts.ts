import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const AlertTypeSchema = z.enum([
  'APPROVAL_NEEDED',
  'RECONNECT_REQUIRED',
  'UNKNOWN_OUTCOME',
  'JOB_FAILURE',
  'BUDGET_THRESHOLD',
  'PAUSE_ACTIVE',
  'FACT_CONFLICT'
]);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const AlertSeveritySchema = z.enum(['critical', 'warning', 'info']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  message: z.string(),
  actionUrl: z.string(),
  actionLabel: z.string(),
  dedupKey: z.string(),
  isPersistent: z.boolean().default(false),
  isAcknowledged: z.boolean().default(false),
  occurrenceCount: z.number().int().positive().default(1),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema,
  acknowledgedAt: ISO8601TimestampSchema.optional()
});
export type AlertRecord = z.infer<typeof AlertRecordSchema>;
