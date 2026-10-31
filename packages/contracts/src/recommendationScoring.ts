import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const HeuristicFactorsSchema = z.object({
  confidence: z.number().min(0).max(1), // 0 to 1
  impact: z.number().min(1).max(5), // 1 (low) to 5 (high)
  relevance: z.number().min(1).max(5),
  gapMagnitude: z.number().min(1).max(5),
  urgency: z.number().min(1).max(5),
  effort: z.number().min(1).max(5), // 1 (easy) to 5 (complex)
  costEstimateUsd: z.number().nonnegative()
});
export type HeuristicFactors = z.infer<typeof HeuristicFactorsSchema>;

export const HardGateCheckSchema = z.object({
  hasConsent: z.boolean(),
  isCapabilitySupported: z.boolean(),
  isEvidenceValidAndActive: z.boolean(),
  isUnderCooldown: z.boolean(),
  passedAllGates: z.boolean(),
  gateFailureReason: z.string().optional()
});
export type HardGateCheck = z.infer<typeof HardGateCheckSchema>;

export const PrioritizedRecommendationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  recommendationTitle: z.string(),
  targetAction: z.string(),
  internalPriorityScore: z.number().min(0).max(100),
  factors: HeuristicFactorsSchema,
  reasonBreakdown: z.record(z.string()),
  hardGates: HardGateCheckSchema,
  requiresOwnerApproval: z.boolean().default(true),
  cooldownExpiresAt: ISO8601TimestampSchema.optional(),
  createdAt: ISO8601TimestampSchema
});
export type PrioritizedRecommendation = z.infer<typeof PrioritizedRecommendationSchema>;
