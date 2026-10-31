import { z } from 'zod';
import { BaseSiteBlockSchema } from './siteRenderer.js';

export const FaqItemSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(5).max(300),
  answer: z.string().min(10).max(2000),
});
export type FaqItem = z.infer<typeof FaqItemSchema>;

export const FaqBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('FAQ'),
  faqs: z.array(FaqItemSchema),
});
export type FaqBlock = z.infer<typeof FaqBlockSchema>;

export const BlogPostItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500),
  contentMarkdown: z.string().min(50).max(20000),
  publishedAt: z.string().datetime(),
  authorName: z.string().max(100),
  coverImageUrl: z.string().url().optional(),
});
export type BlogPostItem = z.infer<typeof BlogPostItemSchema>;

export const BlogBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('BLOG'),
  posts: z.array(BlogPostItemSchema),
});
export type BlogBlock = z.infer<typeof BlogBlockSchema>;

export const BlockUpdateCommandSchema = z.object({
  blockId: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
  updatedData: z.record(z.any()).optional(),
});
export type BlockUpdateCommand = z.infer<typeof BlockUpdateCommandSchema>;

export const RevisionCompareResultSchema = z.object({
  fromRevisionId: z.string().uuid(),
  toRevisionId: z.string().uuid(),
  blocksAdded: z.array(z.string().uuid()),
  blocksRemoved: z.array(z.string().uuid()),
  blocksModified: z.array(
    z.object({
      blockId: z.string().uuid(),
      blockType: z.string(),
      fieldDiffs: z.record(
        z.object({
          before: z.any(),
          after: z.any(),
        })
      ),
    })
  ),
  isMetaModified: z.boolean(),
  themeModified: z.boolean(),
});
export type RevisionCompareResult = z.infer<typeof RevisionCompareResultSchema>;

export const LocalPageRequestSchema = z.object({
  siteId: z.string().uuid(),
  targetCityOrArea: z.string().min(2).max(100),
  serviceFocus: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  differentiatedOfferings: z.array(z.string().min(5).max(300)).min(1),
  confirmedPremisesOrServiceArea: z.string().min(2).max(200),
  customBioOrIntro: z.string().min(50).max(2000),
});
export type LocalPageRequest = z.infer<typeof LocalPageRequestSchema>;

export const AntiDoorwayCheckResultSchema = z.object({
  isAllowed: z.boolean(),
  duplicateSimilarityScore: z.number().min(0).max(1),
  rejectionReason: z.string().optional(),
  differentiatedFactVerified: z.boolean(),
});
export type AntiDoorwayCheckResult = z.infer<typeof AntiDoorwayCheckResultSchema>;

export const PublishRevisionRequestSchema = z.object({
  siteId: z.string().uuid(),
  expectedDraftRevisionId: z.string().uuid(),
  publishNote: z.string().max(200).optional(),
});
export type PublishRevisionRequest = z.infer<typeof PublishRevisionRequestSchema>;

export const RestoreRevisionRequestSchema = z.object({
  siteId: z.string().uuid(),
  targetRevisionId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});
export type RestoreRevisionRequest = z.infer<typeof RestoreRevisionRequestSchema>;
