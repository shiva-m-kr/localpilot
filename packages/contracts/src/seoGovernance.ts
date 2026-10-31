import { z } from 'zod';

export const SitemapEntrySchema = z.object({
  url: z.string().url(),
  lastmod: z.string().datetime(),
  changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).default('weekly'),
  priority: z.number().min(0.0).max(1.0).default(0.8),
});
export type SitemapEntry = z.infer<typeof SitemapEntrySchema>;

export const RedirectRuleSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  sourcePath: z.string().min(1).max(300).regex(/^\/[a-zA-Z0-9\-_/]*$/),
  targetPath: z.string().min(1).max(300),
  statusCode: z.enum(['301', '302']).default('301'),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
});
export type RedirectRule = z.infer<typeof RedirectRuleSchema>;

export const SiteIndexingConfigSchema = z.object({
  siteId: z.string().uuid(),
  allowIndexing: z.boolean().default(true),
  disallowedPaths: z.array(z.string()).default(['/api/', '/admin/', '/drafts/']),
  previousSnapshotId: z.string().uuid().optional(),
  lastChangedAt: z.string().datetime(),
  changedByUserId: z.string().uuid(),
});
export type SiteIndexingConfig = z.infer<typeof SiteIndexingConfigSchema>;

export const IndexingApiSubmissionRequestSchema = z.object({
  url: z.string().url(),
  pageType: z.enum(['LOCAL_PAGE', 'BLOG_POST', 'JOB_POSTING', 'BROADCAST_EVENT']),
});
export type IndexingApiSubmissionRequest = z.infer<typeof IndexingApiSubmissionRequestSchema>;

export const IndexingApiSubmissionResultSchema = z.object({
  isAllowed: z.boolean(),
  submitted: z.boolean(),
  message: z.string(),
  policyNote: z.string(),
});
export type IndexingApiSubmissionResult = z.infer<typeof IndexingApiSubmissionResultSchema>;
