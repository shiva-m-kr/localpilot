import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const RecoveryIncidentTypeSchema = z.enum([
  'TIMEOUT_AFTER_ACCEPTANCE',
  'PARTIAL_MEDIA_UPLOAD',
  'REVOKED_PERMISSIONS',
  'REMOTE_CONTENT_DRIFT',
  'DEAD_LETTER_JOB'
]);
export type RecoveryIncidentType = z.infer<typeof RecoveryIncidentTypeSchema>;

export const RecoveryStatusSchema = z.enum([
  'NEEDS_OPERATOR_REVIEW',
  'RECONCILED_SUCCESS',
  'RETRY_BOUNDED_STEP',
  'CANCELLED_BY_OPERATOR'
]);
export type RecoveryStatus = z.infer<typeof RecoveryStatusSchema>;

export const IncidentResolutionActionSchema = z.enum([
  'FORCE_RETRY_STEP',
  'ADOPT_REMOTE_CONTENT',
  'CANCEL_DISPATCH',
  'RECONNECT_ACCOUNT'
]);
export type IncidentResolutionAction = z.infer<typeof IncidentResolutionActionSchema>;

export const PublicationIncidentRecordSchema = z.object({
  incidentId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  provider: z.string(), // e.g. "wordpress", "gbp", "instagram", "facebook"
  externalId: z.string().optional(),
  incidentType: RecoveryIncidentTypeSchema,
  expectedHash: z.string(),
  actualRemoteHash: z.string().optional(),
  errorSummary: z.string(),
  stepAttemptCount: z.number().int().default(1),
  maxStepRetries: z.number().int().default(3),
  status: RecoveryStatusSchema,
  createdAt: ISO8601TimestampSchema,
  resolvedAt: ISO8601TimestampSchema.optional()
});
export type PublicationIncidentRecord = z.infer<typeof PublicationIncidentRecordSchema>;
