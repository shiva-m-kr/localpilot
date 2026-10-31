import { z } from 'zod';
import { CurrencyCodeSchema } from './money.js';

export const DirectoryRegionSchema = z.enum(['IN', 'US', 'GB', 'AU', 'CA', 'GLOBAL']);
export type DirectoryRegion = z.infer<typeof DirectoryRegionSchema>;

export const DirectoryVerticalSchema = z.enum([
  'GENERAL_LOCAL',
  'HOME_SERVICES',
  'HEALTHCARE',
  'B2B_COMMERCIAL',
  'RETAIL_DINING',
  'PROFESSIONAL_SERVICES',
]);
export type DirectoryVertical = z.infer<typeof DirectoryVerticalSchema>;

export const DirectorySubmissionMethodSchema = z.enum([
  'DIRECT_API',
  'PARTNER_FEED',
  'MANUAL_PORTAL',
  'CLAIM_LINK',
]);
export type DirectorySubmissionMethod = z.infer<typeof DirectorySubmissionMethodSchema>;

export const DirectoryVerificationMethodSchema = z.enum([
  'PHONE_OTP',
  'POSTAL_CARD',
  'BUSINESS_EMAIL',
  'DOCUMENT_UPLOAD',
  'NONE',
]);
export type DirectoryVerificationMethod = z.infer<typeof DirectoryVerificationMethodSchema>;

export const DirectoryAutomationPermissionSchema = z.enum([
  'AUTOMATION_PERMITTED',
  'MANUAL_ONLY',
  'PARTNER_AUTHORIZED_ONLY',
]);
export type DirectoryAutomationPermission = z.infer<typeof DirectoryAutomationPermissionSchema>;

export const DirectoryFeeTypeSchema = z.enum(['FREE', 'PAID_SUBSCRIPTION', 'ONE_TIME_FEE']);
export type DirectoryFeeType = z.infer<typeof DirectoryFeeTypeSchema>;

export const DirectoryFeeStructureSchema = z.object({
  feeType: DirectoryFeeTypeSchema,
  amount: z.number().min(0).default(0),
  currency: CurrencyCodeSchema.default('INR'),
  billingInterval: z.enum(['MONTHLY', 'ANNUAL', 'ONE_TIME', 'NONE']).default('NONE'),
  disclosure: z.string().max(300),
});
export type DirectoryFeeStructure = z.infer<typeof DirectoryFeeStructureSchema>;

export const DirectoryCatalogItemSchema = z.object({
  id: z.string().min(2).max(50),
  name: z.string().min(1).max(100),
  domain: z.string().min(3).max(100),
  region: DirectoryRegionSchema,
  relevantVerticals: z.array(DirectoryVerticalSchema),
  authorityTier: z.enum(['TIER_1_CORE', 'TIER_2_INDUSTRY', 'TIER_3_LOCAL_NICHE']),
  submissionMethod: DirectorySubmissionMethodSchema,
  verificationRequirement: DirectoryVerificationMethodSchema,
  automationPermission: DirectoryAutomationPermissionSchema,
  fees: DirectoryFeeStructureSchema,
  requiresOwnerOtp: z.boolean().default(false),
  portalLoginUrl: z.string().url().optional(),
  apiPartnerContractVerified: z.boolean().default(false),
  lastPolicyVerifiedAt: z.string().datetime(),
});
export type DirectoryCatalogItem = z.infer<typeof DirectoryCatalogItemSchema>;

export const QueryDirectoryCatalogRequestSchema = z.object({
  country: DirectoryRegionSchema,
  vertical: DirectoryVerticalSchema.optional(),
  allowManualDirectories: z.boolean().default(true),
});
export type QueryDirectoryCatalogRequest = z.infer<typeof QueryDirectoryCatalogRequestSchema>;
