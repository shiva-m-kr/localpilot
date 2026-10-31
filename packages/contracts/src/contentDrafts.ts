import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ContentBlockTypeSchema = z.enum([
  'HEADING',
  'PARAGRAPH',
  'BULLET_LIST',
  'LOCAL_CTA',
  'KEY_TAKEAWAY',
  'IMAGE_CALLOUT'
]);
export type ContentBlockType = z.infer<typeof ContentBlockTypeSchema>;

export const ContentBlockSchema = z.object({
  id: z.string().uuid(),
  type: ContentBlockTypeSchema,
  level: z.number().int().min(1).max(6).optional(), // For headings (h1, h2, h3)
  content: z.string(),
  claimsFactIds: z.array(z.string().uuid()).default([])
});
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const ClaimReferenceSchema = z.object({
  claimText: z.string(),
  factKey: z.string().optional(),
  factId: z.string().uuid().optional(),
  verified: z.boolean(),
  requiresManualReview: z.boolean().default(false),
  rationale: z.string().optional()
});
export type ClaimReference = z.infer<typeof ClaimReferenceSchema>;

export const DraftValidationIssueSchema = z.object({
  code: z.enum([
    'UNSUPPORTED_PRICING',
    'FAKE_HOURS_CLAIM',
    'NAP_MISMATCH',
    'UNSAFE_LINK_SSRF',
    'PROMPT_INJECTION_DETECTED',
    'REPEATED_FILLER_DETECTED',
    'ADDRESS_LEAK_SAB'
  ]),
  severity: z.enum(['BLOCKER', 'WARNING']),
  message: z.string(),
  affectedBlockId: z.string().uuid().optional()
});
export type DraftValidationIssue = z.infer<typeof DraftValidationIssueSchema>;

export const DraftStatusSchema = z.enum([
  'DRAFTED',
  'VALIDATION_FAILED',
  'VALIDATION_PASSED',
  'NEEDS_HUMAN_REVIEW',
  'APPROVED'
]);
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

export const StructuredDraftSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  campaignPlanId: z.string().uuid().optional(),
  title: z.string().min(5),
  metaDescription: z.string().min(20).max(160),
  blocks: z.array(ContentBlockSchema).min(1),
  claims: z.array(ClaimReferenceSchema).default([]),
  internalLinks: z.array(z.string().url()).default([]),
  outboundLinks: z.array(z.string().url()).default([]),
  status: DraftStatusSchema,
  validationIssues: z.array(DraftValidationIssueSchema).default([]),
  repairAttempts: z.number().int().default(0),
  maxRepairAttempts: z.number().int().default(2),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type StructuredDraft = z.infer<typeof StructuredDraftSchema>;
