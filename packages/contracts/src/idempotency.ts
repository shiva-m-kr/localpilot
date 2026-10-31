import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const OperationFailureCategorySchema = z.enum([
  'VALIDATION',
  'AUTHORIZATION',
  'RATE_LIMIT',
  'TRANSIENT_NETWORK',
  'AMBIGUOUS_EXTERNAL_WRITE'
]);
export type OperationFailureCategory = z.infer<typeof OperationFailureCategorySchema>;

export const ProviderWriteOutcomeSchema = z.object({
  status: z.enum(['success', 'failed', 'ambiguous']),
  rawTransportSuccess: z.boolean(),
  failureCategory: OperationFailureCategorySchema.optional(),
  httpStatusCode: z.number().int().optional(),
  externalId: z.string().optional(),
  userAction: z.string().optional(),
  reconciliationRequired: z.boolean().default(false),
  reconciliationJobId: z.string().optional()
});
export type ProviderWriteOutcome = z.infer<typeof ProviderWriteOutcomeSchema>;

export const IdempotencyRecordSchema = z.object({
  key: z.string(),
  organizationId: z.string().uuid(),
  commandId: z.string().uuid(),
  status: z.enum(['in_progress', 'completed', 'failed']),
  result: z.record(z.unknown()).optional(),
  failureCategory: OperationFailureCategorySchema.optional(),
  attemptCount: z.number().int().nonnegative().default(1),
  createdAt: ISO8601TimestampSchema,
  expiresAt: ISO8601TimestampSchema
});
export type IdempotencyRecord = z.infer<typeof IdempotencyRecordSchema>;
