import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const GbpPostTopicTypeSchema = z.enum([
  'STANDARD',
  'EVENT',
  'OFFER',
  'ALERT'
]);
export type GbpPostTopicType = z.infer<typeof GbpPostTopicTypeSchema>;

export const GbpCallToActionTypeSchema = z.enum([
  'BOOK',
  'ORDER',
  'SHOP',
  'LEARN_MORE',
  'SIGN_UP',
  'CALL'
]);
export type GbpCallToActionType = z.infer<typeof GbpCallToActionTypeSchema>;

export const GbpOfferSpecSchema = z.object({
  couponCode: z.string().optional(),
  redeemOnlineUrl: z.string().url().optional(),
  termsConditions: z.string().optional(),
  startDate: ISO8601TimestampSchema,
  endDate: ISO8601TimestampSchema
});
export type GbpOfferSpec = z.infer<typeof GbpOfferSpecSchema>;

export const GbpPostPayloadSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  topicType: GbpPostTopicTypeSchema,
  summary: z.string().min(10).max(1500),
  callToAction: z
    .object({
      actionType: GbpCallToActionTypeSchema,
      url: z.string().url().optional()
    })
    .optional(),
  offer: GbpOfferSpecSchema.optional(),
  mediaUrls: z.array(z.string().url()).default([]),
  status: z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED_BY_GBP']),
  externalPostId: z.string().optional(),
  rejectionReason: z.string().optional(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type GbpPostPayload = z.infer<typeof GbpPostPayloadSchema>;

export const GbpSensitiveFieldTypeSchema = z.enum([
  'BUSINESS_NAME',
  'STREET_ADDRESS',
  'PRIMARY_CATEGORY',
  'REGULAR_HOURS',
  'SPECIAL_HOURS'
]);
export type GbpSensitiveFieldType = z.infer<typeof GbpSensitiveFieldTypeSchema>;

export const GbpFieldProposalSchema = z.object({
  proposalId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  fieldType: GbpSensitiveFieldTypeSchema,
  currentValue: z.string(),
  proposedValue: z.string(),
  rationale: z.string(),
  status: z.enum(['PROPOSED', 'APPROVED', 'REJECTED', 'APPLIED']),
  approvedByUserId: z.string().uuid().optional(),
  appliedAt: ISO8601TimestampSchema.optional(),
  createdAt: ISO8601TimestampSchema
});
export type GbpFieldProposal = z.infer<typeof GbpFieldProposalSchema>;
