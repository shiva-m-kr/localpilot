import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ChannelPlatformSchema = z.enum([
  'WORDPRESS_BLOG',
  'GBP_POST',
  'INSTAGRAM',
  'FACEBOOK'
]);
export type ChannelPlatform = z.infer<typeof ChannelPlatformSchema>;

export const ChannelVariantStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'WAITING_ON_PREREQUISITE',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED'
]);
export type ChannelVariantStatus = z.infer<typeof ChannelVariantStatusSchema>;

export const ChannelVariantPayloadSchema = z.object({
  title: z.string().optional(),
  body: z.string(),
  mediaAssetId: z.string().uuid().optional(),
  callToAction: z
    .object({
      label: z.string(),
      url: z.string().url().optional(),
      actionType: z.enum(['CALL', 'BOOK', 'LEARN_MORE', 'ORDER', 'NONE'])
    })
    .optional(),
  hashtags: z.array(z.string()).default([]),
  targetUrl: z.string().url().optional()
});
export type ChannelVariantPayload = z.infer<typeof ChannelVariantPayloadSchema>;

export const ChannelVariantSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  platform: ChannelPlatformSchema,
  destinationAccountId: z.string(),
  dependsOnVariantId: z.string().uuid().optional(),
  requiresBlogUrl: z.boolean().default(false),
  prerequisiteVerifiedUrl: z.string().url().optional(),
  payload: ChannelVariantPayloadSchema,
  status: ChannelVariantStatusSchema,
  isApproved: z.boolean().default(false),
  approvedPayloadHash: z.string().optional(),
  publishedExternalId: z.string().optional(),
  publishedLiveUrl: z.string().url().optional(),
  failureReason: z.string().optional(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type ChannelVariant = z.infer<typeof ChannelVariantSchema>;
