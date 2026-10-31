import { z } from 'zod';
import { LocationIdSchema } from './identifiers.js';

export const PresenceFieldSchema = z.enum([
  'HOURS',
  'PHONE',
  'ADDRESS',
  'SERVICES',
  'SPECIAL_OFFER',
]);
export type PresenceField = z.infer<typeof PresenceFieldSchema>;

export const PresenceConflictTypeSchema = z.enum([
  'EXTERNAL_PROVIDER_CHANGE',     // e.g. Google user edit or suggested change
  'EXPIRED_OFFER_DETECTED',       // e.g. festival discount that has passed its end date
  'STALE_DEPENDENT_DRAFTS',       // e.g. drafts scheduled with outdated phone/hours
  'DIRECTORY_DATA_DISCREPANCY',   // e.g. mismatch on secondary listing
]);
export type PresenceConflictType = z.infer<typeof PresenceConflictTypeSchema>;

export const ConflictResolutionActionSchema = z.enum([
  'QUEUE_OWNER_CORRECTION_TASK',  // Human confirmed; never blind auto-revert!
  'INVALIDATE_DEPENDENT_DRAFTS',
  'PURGE_EXPIRED_CACHE',
  'ACCEPT_EXTERNAL_CHANGE',
]);
export type ConflictResolutionAction = z.infer<typeof ConflictResolutionActionSchema>;

export const PresenceConflictRecordSchema = z.object({
  id: z.string().uuid(),
  locationId: LocationIdSchema,
  conflictType: PresenceConflictTypeSchema,
  field: PresenceFieldSchema,
  sourceProvider: z.string().max(100),
  confirmedLocalValue: z.string(),
  observedExternalValue: z.string(),
  suggestedAction: ConflictResolutionActionSchema,
  actionExplanation: z.string().max(500),
  isResolved: z.boolean().default(false),
  detectedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});
export type PresenceConflictRecord = z.infer<typeof PresenceConflictRecordSchema>;

export const StaleDraftInvalidationResultSchema = z.object({
  locationId: LocationIdSchema,
  affectedDraftsCount: z.number().int().min(0),
  invalidatedDraftIds: z.array(z.string().uuid()),
  invalidationReason: z.string(),
});
export type StaleDraftInvalidationResult = z.infer<typeof StaleDraftInvalidationResultSchema>;
