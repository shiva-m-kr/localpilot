import { z } from 'zod';
import { LocationIdSchema } from './identifiers.js';

export const NapFieldStatusSchema = z.enum([
  'EXACT_MATCH',
  'FORMATTING_VARIATION',
  'CRITICAL_MISMATCH',
  'NOT_APPLICABLE_SAB_HIDDEN',
  'MISSING_ON_DIRECTORY',
]);
export type NapFieldStatus = z.infer<typeof NapFieldStatusSchema>;

export const NapMatchConfidenceSchema = z.enum([
  'HIGH_CONFIDENCE_MATCH',
  'AMBIGUOUS_MATCH_REQUIRES_OWNER_CONFIRMATION',
  'NO_MATCH_FOUND',
]);
export type NapMatchConfidence = z.infer<typeof NapMatchConfidenceSchema>;

export const OverallNapStatusSchema = z.enum([
  'CONSISTENT',
  'NEEDS_UPDATE',
  'CRITICAL_NAP_CONFLICT',
  'PENDING_OWNER_CONFIRMATION',
]);
export type OverallNapStatus = z.infer<typeof OverallNapStatusSchema>;

export const FieldMismatchDetailSchema = z.object({
  field: z.enum(['NAME', 'PHONE', 'ADDRESS', 'WEBSITE', 'CATEGORY']),
  status: NapFieldStatusSchema,
  confirmedValue: z.string(),
  observedValue: z.string(),
  isCosmetic: z.boolean(),
  differenceExplanation: z.string(),
});
export type FieldMismatchDetail = z.infer<typeof FieldMismatchDetailSchema>;

export const CitationListingMatchResultSchema = z.object({
  id: z.string().uuid(),
  locationId: LocationIdSchema,
  directoryId: z.string(),
  directoryName: z.string(),
  listingUrl: z.string().url(),
  matchConfidence: NapMatchConfidenceSchema,
  isOwnedAndVerified: z.boolean().default(false),
  overallNapStatus: OverallNapStatusSchema,
  fieldComparisons: z.array(FieldMismatchDetailSchema),
  isSABProtected: z.boolean(),
  observedAt: z.string().datetime(),
});
export type CitationListingMatchResult = z.infer<typeof CitationListingMatchResultSchema>;

export const DiscoveredDirectoryListingSchema = z.object({
  directoryId: z.string(),
  directoryName: z.string(),
  listingUrl: z.string().url(),
  observedName: z.string(),
  observedPhone: z.string().optional(),
  observedAddress: z.string().optional(),
  observedCity: z.string().optional(),
  observedWebsite: z.string().optional(),
  observedCategory: z.string().optional(),
});
export type DiscoveredDirectoryListing = z.infer<typeof DiscoveredDirectoryListingSchema>;
