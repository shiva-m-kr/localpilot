import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ImageOriginTypeSchema = z.enum([
  'APPROVED_REAL_PHOTO',
  'AI_ILLUSTRATION'
]);
export type ImageOriginType = z.infer<typeof ImageOriginTypeSchema>;

export const TargetPlatformMediaSchema = z.enum([
  'WORDPRESS_HERO',
  'GBP_UPDATE',
  'INSTAGRAM_SQUARE',
  'INSTAGRAM_STORY',
  'FACEBOOK_FEED'
]);
export type TargetPlatformMedia = z.infer<typeof TargetPlatformMediaSchema>;

export const SocialPostCategorySchema = z.enum([
  'EDUCATIONAL_TIP',
  'COMPANY_ANNOUNCEMENT',
  'PORTFOLIO_PROOF',
  'BEFORE_AFTER_SHOWCASE',
  'SEASONAL_PROMOTION'
]);
export type SocialPostCategory = z.infer<typeof SocialPostCategorySchema>;

export const BrandOverlayConfigSchema = z.object({
  logoAssetId: z.string().uuid().optional(),
  position: z.enum(['TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT', 'NONE']).default('BOTTOM_RIGHT'),
  opacity: z.number().min(0).max(1).default(0.85)
});
export type BrandOverlayConfig = z.infer<typeof BrandOverlayConfigSchema>;

export const SocialImageSpecSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  originType: ImageOriginTypeSchema,
  platform: TargetPlatformMediaSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  aspectRatio: z.string(), // e.g. "1:1", "16:9", "4:3"
  altText: z.string().min(10).max(250),
  sourceRightsLabel: z.string(),
  brandOverlay: BrandOverlayConfigSchema,
  isReused: z.boolean(),
  specHash: z.string(),
  createdAt: ISO8601TimestampSchema
});
export type SocialImageSpec = z.infer<typeof SocialImageSpecSchema>;
