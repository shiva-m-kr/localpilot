import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ActionPlanStatusSchema = z.enum([
  'DRAFT',
  'READY_FOR_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED_BY_PREREQUISITE',
  'REJECTED',
  'SNOOZED'
]);
export type ActionPlanStatus = z.infer<typeof ActionPlanStatusSchema>;

export const ActionPlanStepSchema = z.object({
  stepId: z.string().uuid(),
  title: z.string(),
  dependsOnStepIds: z.array(z.string().uuid()).default([]),
  isPrerequisiteMet: z.boolean().default(false),
  isExecuted: z.boolean().default(false),
  executedAt: ISO8601TimestampSchema.optional(),
  externalId: z.string().optional(),
  verificationProof: z.string().optional()
});
export type ActionPlanStep = z.infer<typeof ActionPlanStepSchema>;

export const ActionPlanSchema = z.object({
  planId: z.string().uuid(),
  recommendationId: z.string().uuid(),
  actionType: z.string(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  title: z.string(),
  assignedUserId: z.string().uuid().optional(),
  status: ActionPlanStatusSchema,
  steps: z.array(ActionPlanStepSchema).min(1),
  snoozedUntil: ISO8601TimestampSchema.optional(),
  rejectionReason: z.string().optional(),
  estimatedCostUsd: z.number().nonnegative().default(0),
  actualCostUsd: z.number().nonnegative().default(0),
  technicalExecutionSuccess: z.boolean().default(false),
  marketingImpactAssessed: z.boolean().default(false),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type ActionPlan = z.infer<typeof ActionPlanSchema>;
