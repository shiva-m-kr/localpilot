import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema } from './identifiers.js';

export const CitationFulfillmentStatusSchema = z.enum([
  'PREPARED',
  'SUBMITTED',
  'VERIFICATION_NEEDED',
  'LIVE_VERIFIED',
  'REJECTED',
  'UPDATE_NEEDED',
]);
export type CitationFulfillmentStatus = z.infer<typeof CitationFulfillmentStatusSchema>;

export const CitationTaskTypeSchema = z.enum([
  'ENTER_PHONE_OTP',
  'ENTER_POSTAL_PIN',
  'UPLOAD_BUSINESS_DOC',
  'CLAIM_MANUAL_PROFILE',
  'REVIEW_DIRECTORY_REJECTION',
]);
export type CitationTaskType = z.infer<typeof CitationTaskTypeSchema>;

export const CitationEvidenceSchema = z.object({
  liveListingUrl: z.string().url(),
  observedAt: z.string().datetime(),
  verifiedPhone: z.string(),
  verifiedBusinessName: z.string(),
  screenshotChecksum: z.string().optional(),
  verifiedByUserId: z.string().uuid().optional(),
});
export type CitationEvidence = z.infer<typeof CitationEvidenceSchema>;

export const CitationFulfillmentRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  directoryId: z.string(),
  directoryName: z.string(),
  status: CitationFulfillmentStatusSchema.default('PREPARED'),
  isLiveVerified: z.boolean().default(false),
  submissionMethod: z.enum(['DIRECT_API', 'PARTNER_FEED', 'MANUAL_PACKET']),
  partnerFeeCreditsSpent: z.number().int().min(0).default(0),
  partnerOrderId: z.string().optional(),
  ownerTask: z.object({
    taskType: CitationTaskTypeSchema,
    instruction: z.string(),
    portalUrl: z.string().url().optional(),
    isPendingOwnerAction: z.boolean(),
  }).optional(),
  evidence: CitationEvidenceSchema.optional(),
  failureReason: z.string().optional(),
  submittedAt: z.string().datetime().optional(),
  verifiedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CitationFulfillmentRecord = z.infer<typeof CitationFulfillmentRecordSchema>;

export const SubmitCitationRequestSchema = z.object({
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  directoryId: z.string(),
  authorizedBudgetCredits: z.number().int().min(0),
});
export type SubmitCitationRequest = z.infer<typeof SubmitCitationRequestSchema>;

export const CompleteVerificationTaskRequestSchema = z.object({
  fulfillmentId: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  verificationCodeOrToken: z.string().min(2),
  liveListingUrl: z.string().url().optional(),
});
export type CompleteVerificationTaskRequest = z.infer<typeof CompleteVerificationTaskRequestSchema>;
