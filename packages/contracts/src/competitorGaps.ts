import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const GapTypeSchema = z.enum([
  'MISSING_CONFIRMED_SERVICE_PAGE',
  'BOOKING_JOURNEY_FRICTION',
  'LOCAL_PROOF_ABSENT',
  'TOPIC_DEPTH_GAP'
]);
export type GapType = z.infer<typeof GapTypeSchema>;

export const GapActionTargetSchema = z.enum([
  'ENHANCE_EXISTING_CANONICAL',
  'CREATE_NEW_SERVICE_PAGE',
  'ADD_LOCAL_PROOF_GALLERY'
]);
export type GapActionTarget = z.infer<typeof GapActionTargetSchema>;

export const CompetitorGapRecommendationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  gapType: GapTypeSchema,
  serviceKey: z.string(),
  recommendationTitle: z.string(),
  actionTarget: GapActionTargetSchema,
  existingCanonicalUrl: z.string().url().optional(),
  evidenceSummary: z.string(),
  practicalCustomerBenefit: z.string(),
  avoidsWordCountCorrelationClaim: z.boolean().default(true),
  avoidsPlagiarizedCopy: z.boolean().default(true),
  createdAt: ISO8601TimestampSchema
});
export type CompetitorGapRecommendation = z.infer<typeof CompetitorGapRecommendationSchema>;
