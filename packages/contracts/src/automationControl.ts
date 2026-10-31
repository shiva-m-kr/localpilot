import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const KillSwitchScopeSchema = z.enum([
  'GLOBAL_ALL',
  'WORDPRESS',
  'GBP',
  'META_FACEBOOK',
  'META_INSTAGRAM',
  'AI_GENERATION'
]);
export type KillSwitchScope = z.infer<typeof KillSwitchScopeSchema>;

export const AutomationPolicySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  autoDraftingEnabled: z.boolean().default(true),
  autoSchedulingEnabled: z.boolean().default(true),
  autoPublishRequiresApproval: z.boolean().default(true), // Default review-first!
  dailySpendCapUsd: z.number().nonnegative().default(10.0),
  monthlySpendCapUsd: z.number().nonnegative().default(150.0),
  currentMonthSpentUsd: z.number().nonnegative().default(0),
  upcomingScheduledCostUsd: z.number().nonnegative().default(0),
  ownerEditWindowMinutes: z.number().int().min(0).default(60), // Grace period before dispatch
  globalKillSwitchEngaged: z.boolean().default(false),
  activeKillSwitches: z.array(KillSwitchScopeSchema).default([]),
  lastVerifiedActivityAt: ISO8601TimestampSchema.optional(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type AutomationPolicy = z.infer<typeof AutomationPolicySchema>;

export const PolicyImpactPreviewSchema = z.object({
  affectedScheduledJobIds: z.array(z.string().uuid()),
  affectedChannels: z.array(z.string()),
  upcomingSavingsUsd: z.number().nonnegative(),
  summary: z.string()
});
export type PolicyImpactPreview = z.infer<typeof PolicyImpactPreviewSchema>;
