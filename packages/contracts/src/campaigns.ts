import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const CampaignItemStatusSchema = z.enum([
  'PROPOSED',
  'APPROVED',
  'EDITED',
  'REMOVED'
]);
export type CampaignItemStatus = z.infer<typeof CampaignItemStatusSchema>;

export const CampaignPlanItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  service: z.string(),
  clusterId: z.string().uuid(),
  channelMix: z.array(z.enum(['wordpress', 'google_business_profile', 'meta'])),
  businessGoal: z.string(),
  sourceFacts: z.array(z.string()),
  neededOwnerEvidence: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  estimatedCredits: z.number().int().positive(),
  status: CampaignItemStatusSchema.default('PROPOSED')
});
export type CampaignPlanItem = z.infer<typeof CampaignPlanItemSchema>;

export const MonthlyCampaignPlanSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  items: z.array(CampaignPlanItemSchema),
  totalEstimatedCredits: z.number().int().positive(),
  isOwnerApproved: z.boolean().default(false),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type MonthlyCampaignPlan = z.infer<typeof MonthlyCampaignPlanSchema>;
