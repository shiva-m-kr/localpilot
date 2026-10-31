import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const EvidenceSourceClassSchema = z.enum([
  'OWNER_CONFIRMED_FACT',
  'GSC_SEARCH_ANALYTICS',
  'SERP_OBSERVATION',
  'GBP_ACCOUNT_SYNC',
  'PUBLIC_WEB_CRAWL'
]);
export type EvidenceSourceClass = z.infer<typeof EvidenceSourceClassSchema>;

export const EvidencePermittedPurposeSchema = z.enum([
  'LOCAL_AUDIT',
  'RECOMMENDATION_JUSTIFICATION',
  'RANK_TRACKING',
  'FACT_VERIFICATION'
]);
export type EvidencePermittedPurpose = z.infer<typeof EvidencePermittedPurposeSchema>;

export const EvidenceRecordStatusSchema = z.enum([
  'ACTIVE',
  'EXPIRED',
  'PURGED'
]);
export type EvidenceRecordStatus = z.infer<typeof EvidenceRecordStatusSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  sourceClass: EvidenceSourceClassSchema,
  permittedPurpose: EvidencePermittedPurposeSchema,
  integrityHash: z.string(), // SHA-256 of raw source payload
  confidenceScore: z.number().min(0).max(1),
  payloadJson: z.string().nullable(), // Null when expired/purged to satisfy data minimization
  isPurged: z.boolean().default(false),
  capturedAt: ISO8601TimestampSchema,
  expiresAt: ISO8601TimestampSchema.nullable(), // Null for owner confirmed facts
  status: EvidenceRecordStatusSchema
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
