import { z } from 'zod';

export const JourneyPillarSchema = z.enum([
  'ONBOARDING_AND_FACTS',
  'CONTENT_DRAFT_SCHEDULE_PUBLISH',
  'SERP_RANK_AND_COMPETITORS',
  'REVIEWS_INBOX_AND_AUTO_REPLY',
  'HOSTED_SITE_AND_SEO_GOVERNANCE',
  'CITATIONS_AND_NAP_VERIFICATION',
  'BILLING_METERING_AND_MARGINS',
  'FAILURE_RECOVERY_AND_PAUSE_RACES',
]);
export type JourneyPillar = z.infer<typeof JourneyPillarSchema>;

export const JourneyVerificationStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  name: z.string(),
  pillar: JourneyPillarSchema,
  status: z.enum(['PASSED', 'FAILED', 'SKIPPED']),
  durationMs: z.number().min(0),
  observedEvidence: z.string(),
});
export type JourneyVerificationStep = z.infer<typeof JourneyVerificationStepSchema>;

export const EndToEndJourneysReportSchema = z.object({
  runId: z.string().uuid(),
  totalJourneysTested: z.number().int().min(0),
  passedJourneysCount: z.number().int().min(0),
  failedJourneysCount: z.number().int().min(0),
  viewportsValidated: z.array(z.string()),
  stressScenariosTested: z.array(z.string()),
  isSystemReadyForPilot: z.boolean(),
  steps: z.array(JourneyVerificationStepSchema),
  timestamp: z.string().datetime(),
});
export type EndToEndJourneysReport = z.infer<typeof EndToEndJourneysReportSchema>;
