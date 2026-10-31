import { z } from 'zod';

export const AuditIssueCategorySchema = z.enum([
  'INDEXABILITY',
  'CANONICAL',
  'METADATA',
  'HEADINGS',
  'BROKEN_LINKS',
  'IMAGES',
  'PERFORMANCE',
  'MOBILE_CONVERSION',
  'STRUCTURED_DATA',
]);
export type AuditIssueCategory = z.infer<typeof AuditIssueCategorySchema>;

export const AuditIssueSeveritySchema = z.enum(['CRITICAL', 'WARNING', 'INFO']);
export type AuditIssueSeverity = z.infer<typeof AuditIssueSeveritySchema>;

export const BookingDestinationStatusSchema = z.enum([
  'VERIFIED_ON_PAGE',
  'MANUAL_VERIFICATION_REQUIRED', // Booking backend requires authenticated session/external calendar
  'MISSING',
]);
export type BookingDestinationStatus = z.infer<typeof BookingDestinationStatusSchema>;

export const AuditIssueSchema = z.object({
  id: z.string().uuid(),
  category: AuditIssueCategorySchema,
  severity: AuditIssueSeveritySchema,
  title: z.string().max(200),
  description: z.string().max(1000),
  pageUrl: z.string().url(),
  recommendation: z.string().max(1000),
  isAutoFixable: z.boolean().default(false),
});
export type AuditIssue = z.infer<typeof AuditIssueSchema>;

export const TechnicalAuditReportSchema = z.object({
  auditId: z.string().uuid(),
  siteId: z.string().uuid(),
  targetUrl: z.string().url(),
  crawledPagesCount: z.number().int().min(0),
  overallScore: z.number().int().min(0).max(100),
  criticalIssuesCount: z.number().int().min(0),
  warningIssuesCount: z.number().int().min(0),
  infoIssuesCount: z.number().int().min(0),
  issues: z.array(AuditIssueSchema),
  conversionChecks: z.object({
    hasClickToCall: z.boolean(),
    clickToCallPhone: z.string().optional(),
    hasEmailContact: z.boolean(),
    hasMobileViewport: z.boolean(),
    bookingDestinationStatus: BookingDestinationStatusSchema,
    bookingVerificationNote: z.string(),
  }),
  observedAt: z.string().datetime(),
});
export type TechnicalAuditReport = z.infer<typeof TechnicalAuditReportSchema>;

export const RunAuditRequestSchema = z.object({
  siteId: z.string().uuid(),
  targetUrl: z.string().url(),
  maxPagesToCrawl: z.number().int().min(1).max(50).default(20),
});
export type RunAuditRequest = z.infer<typeof RunAuditRequestSchema>;
