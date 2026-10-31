import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema } from './identifiers.js';

export const UsageCategorySchema = z.enum([
  'BLOG_POSTS',
  'SOCIAL_VARIANTS',
  'APPROVED_IMAGES',
  'SERP_SCAN_POINTS',
  'REVIEW_REPLIES',
  'DIRECTORY_CITATIONS',
]);
export type UsageCategory = z.infer<typeof UsageCategorySchema>;

export const CategoryAllowanceSchema = z.object({
  category: UsageCategorySchema,
  monthlyLimit: z.number().int().min(0),
  usedCount: z.number().int().min(0).default(0),
  reservedCount: z.number().int().min(0).default(0),
  remainingCount: z.number().int().min(0),
  unitCostInCredits: z.number().int().min(0),
});
export type CategoryAllowance = z.infer<typeof CategoryAllowanceSchema>;

export const LocationEntitlementsReportSchema = z.object({
  locationId: LocationIdSchema,
  tenantId: OrganizationIdSchema,
  planTier: z.string(),
  cycleResetDateIso: z.string().datetime(),
  allowances: z.array(CategoryAllowanceSchema),
  allowOverages: z.boolean().default(false), // Explicit toggle; NO surprise auto-recharge
  overageCapCredits: z.number().int().min(0).default(0),
  currentOverageUsedCredits: z.number().int().min(0).default(0),
});
export type LocationEntitlementsReport = z.infer<typeof LocationEntitlementsReportSchema>;

export const TenantCostRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  expenseCategory: z.enum(['AI_INFERENCE', 'SERP_PROVIDER', 'PARTNER_FULFILLMENT', 'HUMAN_SUPPORT']),
  costMinor: z.number().int().min(0),
  currency: z.string().default('INR'),
  memo: z.string(),
  recordedAt: z.string().datetime(),
});
export type TenantCostRecord = z.infer<typeof TenantCostRecordSchema>;

export const TenantMarginReportSchema = z.object({
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  revenueMinor: z.number().int().min(0),
  aiInferenceCostMinor: z.number().int().min(0),
  serpProviderCostMinor: z.number().int().min(0),
  fulfillmentCostMinor: z.number().int().min(0),
  supportCostMinor: z.number().int().min(0),
  totalCostMinor: z.number().int().min(0),
  grossMarginPercentage: z.number().min(-100).max(100),
  isMarginHealthy: z.boolean(),
});
export type TenantMarginReport = z.infer<typeof TenantMarginReportSchema>;
