import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const FactConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type FactConfidence = z.infer<typeof FactConfidenceSchema>;

export const ExtractedFactSchema = z.object({
  id: z.string().uuid(),
  field: z.string(), // e.g. 'businessName', 'phone', 'hours', 'service'
  value: z.unknown(),
  sourceUrl: z.string().url(),
  observedAt: ISO8601TimestampSchema,
  confidence: FactConfidenceSchema,
  isConfirmed: z.boolean().default(false), // Imported facts start unconfirmed
  isUntrusted: z.literal(true).default(true), // Strictly treated as untrusted data
  rawSnippet: z.string().max(500).optional()
});

export type ExtractedFact = z.infer<typeof ExtractedFactSchema>;

export const CrawlStatusSchema = z.enum([
  'QUEUED',
  'CRAWLING',
  'EXTRACTING',
  'COMPLETED',
  'FAILED'
]);
export type CrawlStatus = z.infer<typeof CrawlStatusSchema>;

export const CrawlJobSchema = z.object({
  jobId: z.string().uuid(),
  organizationId: z.string().uuid(),
  targetUrl: z.string().url(),
  status: CrawlStatusSchema,
  pagesCrawled: z.number().int().nonnegative().default(0),
  maxPages: z.number().int().positive().default(15), // Bounded crawl limit
  discoveredPages: z.array(z.string().url()).default([]),
  extractedFacts: z.array(ExtractedFactSchema).default([]),
  discoveredPhotos: z.array(z.string().url()).default([]),
  errors: z.array(z.string()).default([]),
  startedAt: ISO8601TimestampSchema,
  completedAt: ISO8601TimestampSchema.optional()
});

export type CrawlJob = z.infer<typeof CrawlJobSchema>;
