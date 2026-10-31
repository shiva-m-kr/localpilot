import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema } from './identifiers.js';

export const LocationGroupSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  name: z.string().min(1).max(100),
  locationIds: z.array(LocationIdSchema),
  createdAt: z.string().datetime(),
});
export type LocationGroup = z.infer<typeof LocationGroupSchema>;

export const PerformanceMetricSummarySchema = z.object({
  metricName: z.string(),
  currentPeriodValue: z.number(),
  previousPeriodValue: z.number(),
  changePercentage: z.number(),
  source: z.string(),
  isObservedMetric: z.boolean().default(true),
});
export type PerformanceMetricSummary = z.infer<typeof PerformanceMetricSummarySchema>;

export const OwnerPerformanceReportSchema = z.object({
  reportId: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  periodStartIso: z.string().datetime(),
  periodEndIso: z.string().datetime(),
  comparisonPeriodStartIso: z.string().datetime(),
  comparisonPeriodEndIso: z.string().datetime(),
  activitySummary: z.object({
    blogsPublished: z.number().int().min(0),
    socialPostsPublished: z.number().int().min(0),
    reviewsReplied: z.number().int().min(0),
    citationsLiveVerified: z.number().int().min(0),
    technicalSeoFixesApplied: z.number().int().min(0),
  }),
  metrics: z.array(PerformanceMetricSummarySchema),
  honestAttributionNotice: z.string(),
  generatedAt: z.string().datetime(),
});
export type OwnerPerformanceReport = z.infer<typeof OwnerPerformanceReportSchema>;

export const AgencyBulkActionItemSchema = z.object({
  locationId: LocationIdSchema,
  hasPermission: z.boolean(),
  hasOwnerConsent: z.boolean(),
  estimatedCreditCost: z.number().int().min(0),
  status: z.enum(['READY', 'PERMISSION_DENIED', 'CONSENT_MISSING', 'COMPLETED', 'FAILED']),
  resultSummary: z.string().optional(),
});
export type AgencyBulkActionItem = z.infer<typeof AgencyBulkActionItemSchema>;

export const AgencyBulkActionResultSchema = z.object({
  actionType: z.string(),
  totalLocations: z.number().int().min(0),
  successfulLocations: z.number().int().min(0),
  failedOrSkippedLocations: z.number().int().min(0),
  totalCreditsSpent: z.number().int().min(0),
  items: z.array(AgencyBulkActionItemSchema),
});
export type AgencyBulkActionResult = z.infer<typeof AgencyBulkActionResultSchema>;
