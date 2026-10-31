import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const RuleFindingCategorySchema = z.enum([
  'SERVICE_GAP',
  'BROKEN_BOOKING_LINK',
  'INCONSISTENT_HOURS',
  'STALE_FACTS',
  'INDEXABILITY_PROBLEM',
  'CITATION_MISMATCH',
  'UNANSWERED_REVIEW'
]);
export type RuleFindingCategory = z.infer<typeof RuleFindingCategorySchema>;

export const RuleSeveritySchema = z.enum(['CRITICAL', 'WARNING', 'OPPORTUNITY']);
export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;

export const DeterministicFindingSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string(),
  ruleVersion: z.number().int().positive().default(1),
  category: RuleFindingCategorySchema,
  severity: RuleSeveritySchema,
  title: z.string(),
  factualSummary: z.string(),
  evidenceRecordIds: z.array(z.string().uuid()).default([]),
  prerequisiteRequired: z.string().optional(),
  remediationAdvice: z.string(),
  isHarmlessFormatting: z.boolean().default(false),
  detectedAt: ISO8601TimestampSchema
});
export type DeterministicFinding = z.infer<typeof DeterministicFindingSchema>;
