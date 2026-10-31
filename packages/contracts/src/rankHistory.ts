import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const RunComparisonEligibilitySchema = z.object({
  isEligible: z.boolean(),
  ineligibilityReason: z.string().optional(),
  baselineConfigHash: z.string(),
  candidateConfigHash: z.string()
});
export type RunComparisonEligibility = z.infer<typeof RunComparisonEligibilitySchema>;

export const AnomalySeveritySchema = z.enum([
  'NORMAL',
  'SIGNIFICANT_DROP',
  'SIGNIFICANT_SURGE'
]);
export type AnomalySeverity = z.infer<typeof AnomalySeveritySchema>;

export const RankComparisonDeltaSchema = z.object({
  baselineRunId: z.string().uuid(),
  candidateRunId: z.string().uuid(),
  isEligible: z.boolean(),
  ineligibilityReason: z.string().optional(),
  top3CoverageDeltaPercent: z.number().nullable(),
  averageFoundRankDelta: z.number().nullable(),
  isAnomaly: z.boolean(),
  anomalySeverity: AnomalySeveritySchema,
  anomalyExplanation: z.string().optional(),
  investigativeEvidenceTaskId: z.string().uuid().optional(),
  comparedAt: ISO8601TimestampSchema
});
export type RankComparisonDelta = z.infer<typeof RankComparisonDeltaSchema>;
