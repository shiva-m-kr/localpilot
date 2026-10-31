import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';
import { ContentBlockSchema } from './contentDrafts.js';

export const RevisionChangeTypeSchema = z.enum([
  'INITIAL_DRAFT',
  'MANUAL_EDIT',
  'AUTOSAVE',
  'AI_SELECTION_REWRITE',
  'RESTORE_PREVIOUS_REVISION'
]);
export type RevisionChangeType = z.infer<typeof RevisionChangeTypeSchema>;

export const DraftRevisionSchema = z.object({
  revisionId: z.string().uuid(),
  draftId: z.string().uuid(),
  revisionNumber: z.number().int().positive(),
  changeType: RevisionChangeTypeSchema,
  changeSummary: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  blocks: z.array(ContentBlockSchema),
  factsVersion: z.number().int().positive(),
  authorUserId: z.string().uuid(),
  payloadHash: z.string(),
  createdAt: ISO8601TimestampSchema
});
export type DraftRevision = z.infer<typeof DraftRevisionSchema>;

export const ApprovalBindingSchema = z.object({
  approvalId: z.string().uuid(),
  draftId: z.string().uuid(),
  revisionNumber: z.number().int().positive(),
  payloadHash: z.string(),
  factsVersion: z.number().int().positive(),
  approvedByUserId: z.string().uuid(),
  approvedAt: ISO8601TimestampSchema
});
export type ApprovalBinding = z.infer<typeof ApprovalBindingSchema>;

export const BlockDiffItemSchema = z.object({
  blockId: z.string().uuid(),
  status: z.enum(['ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED']),
  oldContent: z.string().optional(),
  newContent: z.string().optional()
});
export type BlockDiffItem = z.infer<typeof BlockDiffItemSchema>;

export const RevisionDiffSchema = z.object({
  fromRevisionNumber: z.number().int().positive(),
  toRevisionNumber: z.number().int().positive(),
  titleChanged: z.boolean(),
  metaDescriptionChanged: z.boolean(),
  blockDiffs: z.array(BlockDiffItemSchema)
});
export type RevisionDiff = z.infer<typeof RevisionDiffSchema>;
