import { z } from 'zod';

export const CapabilityGateDecisionSchema = z.enum([
  'GO_ENABLED',
  'GO_RESTRICTED_PILOT',
  'BLOCKED_EXTERNALLY_GATED',
  'NO_GO_DISABLED',
]);
export type CapabilityGateDecision = z.infer<typeof CapabilityGateDecisionSchema>;

export const CapabilityLaunchStatusSchema = z.object({
  capabilityName: z.string(),
  decision: CapabilityGateDecisionSchema,
  rationale: z.string(),
  monetizationPolicy: z.string(),
  unresolvedExternalDependency: z.string().optional(),
});
export type CapabilityLaunchStatus = z.infer<typeof CapabilityLaunchStatusSchema>;

export const PilotMetricsSummarySchema = z.object({
  totalPilotLocationsCount: z.number().int().min(5).max(50),
  onboardingActivationRatePercentage: z.number().min(0).max(100),
  medianOwnerReviewTimeSeconds: z.number().min(0),
  publicationReliabilityRatePercentage: z.number().min(0).max(100),
  autoReplyFalseEligibilityPercentage: z.number().min(0).max(100),
  averageMonthlySupportMinutesPerTenant: z.number().min(0),
  averageMonthlyVariableCostMinor: z.number().int().min(0),
  averageGrossMarginPercentage: z.number().min(0).max(100),
});
export type PilotMetricsSummary = z.infer<typeof PilotMetricsSummarySchema>;

export const LaunchDecisionReportSchema = z.object({
  decisionId: z.string().uuid(),
  overallDecision: z.enum(['GO_FOR_COMMERCIAL_LAUNCH', 'CONDITIONAL_PILOT_EXTENDED', 'NO_GO_HALT']),
  evaluatedAt: z.string().datetime(),
  pilotMetrics: PilotMetricsSummarySchema,
  capabilities: z.array(CapabilityLaunchStatusSchema),
  commercialPolicy: z.object({
    chargeOnlyForVerifiedWorkingFeatures: z.boolean(),
    noGuaranteedRankingsClaimed: z.boolean(),
    clearCancellationAndExportPolicy: z.boolean(),
  }),
  nextReleaseBacklog: z.array(z.string()),
  executiveSummary: z.string(),
});
export type LaunchDecisionReport = z.infer<typeof LaunchDecisionReportSchema>;
