import { z } from 'zod';
import { AuditIssueCategorySchema } from './technicalAudit.js';

export const FixProposalTypeSchema = z.enum([
  'ADD_CANONICAL',
  'UPDATE_TITLE',
  'ADD_META_DESCRIPTION',
  'ADD_IMAGE_ALT',
  'ADD_REDIRECT',
  'REMOVE_NOINDEX',
]);
export type FixProposalType = z.infer<typeof FixProposalTypeSchema>;

export const FixTargetPlatformSchema = z.enum(['HOSTED_LOCALPILOT', 'EXTERNAL_WORDPRESS']);
export type FixTargetPlatform = z.infer<typeof FixTargetPlatformSchema>;

export const FixProposalStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'APPLIED',
  'FAILED_VERIFICATION',
  'ROLLED_BACK',
  'MANUAL_INSTRUCTIONS_PROVIDED',
]);
export type FixProposalStatus = z.infer<typeof FixProposalStatusSchema>;

export const SeoFixProposalSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  siteId: z.string().uuid(),
  category: AuditIssueCategorySchema,
  proposalType: FixProposalTypeSchema,
  targetPlatform: FixTargetPlatformSchema,
  pageUrl: z.string().url(),
  fieldToUpdate: z.string(),
  currentValue: z.string(),
  proposedValue: z.string(),
  explanation: z.string().max(500),
  status: FixProposalStatusSchema.default('PENDING_REVIEW'),
  snapshotId: z.string().uuid().optional(),
  readbackVerified: z.boolean().default(false),
  manualSteps: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  approvedAt: z.string().datetime().optional(),
  appliedAt: z.string().datetime().optional(),
  rolledBackAt: z.string().datetime().optional(),
});
export type SeoFixProposal = z.infer<typeof SeoFixProposalSchema>;

export const ApplyFixRequestSchema = z.object({
  proposalId: z.string().uuid(),
  siteId: z.string().uuid(),
  userId: z.string().uuid(),
  consentAcknowledged: z.boolean(),
});
export type ApplyFixRequest = z.infer<typeof ApplyFixRequestSchema>;

export const RollbackFixRequestSchema = z.object({
  proposalId: z.string().uuid(),
  siteId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type RollbackFixRequest = z.infer<typeof RollbackFixRequestSchema>;
