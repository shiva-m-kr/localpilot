import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const FactCategorySchema = z.enum([
  'NAP_NAME',
  'NAP_PHONE',
  'NAP_ADDRESS',
  'OPERATING_HOURS',
  'SERVICE_OFFERING',
  'BOOKING_DESTINATION'
]);
export type FactCategory = z.infer<typeof FactCategorySchema>;

export const ConfirmedFactSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(), // Nullable if business-wide default
  category: FactCategorySchema,
  key: z.string(), // e.g. 'publicPhone', 'sundayHours'
  value: z.string(),
  version: z.number().int().positive().default(1),
  confirmedByUserId: z.string().uuid(),
  confirmedAt: ISO8601TimestampSchema,
  sourceUrl: z.string().optional()
});

export type ConfirmedFact = z.infer<typeof ConfirmedFactSchema>;

export const FactConflictTypeSchema = z.enum([
  'HARMLESS_FORMATTING', // e.g. "+91 80 4123 4567" vs "+91-80-41234567"
  'ACTUAL_DISAGREEMENT' // e.g. "9:00 AM - 5:00 PM" vs "Closed"
]);
export type FactConflictType = 'HARMLESS_FORMATTING' | 'ACTUAL_DISAGREEMENT';

export const FactConflictRecordSchema = z.object({
  conflictId: z.string().uuid(),
  category: FactCategorySchema,
  key: z.string(),
  currentConfirmedValue: z.string(),
  importedValue: z.string(),
  conflictType: z.enum(['HARMLESS_FORMATTING', 'ACTUAL_DISAGREEMENT']),
  sourceUrl: z.string().url(),
  observedAt: ISO8601TimestampSchema,
  status: z.enum(['UNRESOLVED', 'RETAIN_CONFIRMED', 'ACCEPT_IMPORTED']).default('UNRESOLVED')
});

export type FactConflictRecord = z.infer<typeof FactConflictRecordSchema>;

export const DownstreamDraftWarningSchema = z.object({
  draftId: z.string().uuid(),
  draftTitle: z.string(),
  channel: z.string(), // 'wordpress' | 'gbp' | 'instagram' | 'facebook'
  approvedAtFactsVersion: z.number().int(),
  currentFactsVersion: z.number().int(),
  staleFactKey: z.string(),
  requiresReapproval: z.literal(true).default(true)
});

export type DownstreamDraftWarning = z.infer<typeof DownstreamDraftWarningSchema>;
