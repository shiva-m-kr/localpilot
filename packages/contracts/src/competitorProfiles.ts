import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const EvidenceMetricSourceSchema = z.enum([
  'LICENSED_SERP_OBSERVATION',
  'PUBLIC_CRAWL',
  'OWNER_SUPPLIED',
  'UNAVAILABLE'
]);
export type EvidenceMetricSource = z.infer<typeof EvidenceMetricSourceSchema>;

export const CompetitorRatingEvidenceSchema = z.object({
  rating: z.number().min(0).max(5).nullable(),
  sampleReviewCount: z.number().int().nonnegative().optional(),
  totalEstimatedReviewCount: z.number().int().nonnegative().optional(),
  isSampledOnly: z.boolean(),
  source: EvidenceMetricSourceSchema
});
export type CompetitorRatingEvidence = z.infer<typeof CompetitorRatingEvidenceSchema>;

export const CompetitorSerpOverlapSchema = z.object({
  top3AppearanceCount: z.number().int().nonnegative(),
  totalSampledPoints: z.number().int().positive(),
  overlapRatePercent: z.number().min(0).max(100),
  definitionText: z.string()
});
export type CompetitorSerpOverlap = z.infer<typeof CompetitorSerpOverlapSchema>;

export const CompetitorEvidenceProfileSchema = z.object({
  profileId: z.string().uuid(),
  competitorId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  businessName: z.string(),
  ratingEvidence: CompetitorRatingEvidenceSchema,
  primaryCategory: z.string(),
  observedServices: z.array(z.string()).default([]),
  backlinkMetric: z.object({
    count: z.number().nullable(),
    isUnavailable: z.boolean(),
    source: EvidenceMetricSourceSchema,
    explanation: z.string()
  }),
  keywordVolumeMetric: z.object({
    volume: z.number().nullable(),
    isUnavailable: z.boolean(),
    source: EvidenceMetricSourceSchema,
    explanation: z.string()
  }),
  serpOverlap: CompetitorSerpOverlapSchema,
  profileObservedAt: ISO8601TimestampSchema,
  profileExpiresAt: ISO8601TimestampSchema
});
export type CompetitorEvidenceProfile = z.infer<typeof CompetitorEvidenceProfileSchema>;
