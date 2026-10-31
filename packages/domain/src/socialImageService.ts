import { createHash, randomUUID } from 'crypto';
import {
  SocialImageSpec,
  ImageOriginType,
  TargetPlatformMedia,
  SocialPostCategory,
  BrandOverlayConfig
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface PlatformAspectRatioRule {
  aspectRatio: string;
  minWidth: number;
  minHeight: number;
  recommendedRatio: number; // width / height
}

export const PLATFORM_ASPECT_RULES: Record<TargetPlatformMedia, PlatformAspectRatioRule> = {
  WORDPRESS_HERO: { aspectRatio: '16:9', minWidth: 1200, minHeight: 675, recommendedRatio: 16 / 9 },
  GBP_UPDATE: { aspectRatio: '4:3', minWidth: 720, minHeight: 540, recommendedRatio: 4 / 3 },
  INSTAGRAM_SQUARE: { aspectRatio: '1:1', minWidth: 1080, minHeight: 1080, recommendedRatio: 1 / 1 },
  INSTAGRAM_STORY: { aspectRatio: '9:16', minWidth: 1080, minHeight: 1920, recommendedRatio: 9 / 16 },
  FACEBOOK_FEED: { aspectRatio: '1.91:1', minWidth: 1200, minHeight: 628, recommendedRatio: 1200 / 628 }
};

export class SocialImageService {
  private static assetSpecCache = new Map<string, SocialImageSpec>();

  /**
   * Clears in-memory spec cache (useful for testing).
   */
  static clearCache(): void {
    this.assetSpecCache.clear();
  }

  /**
   * Computes deterministic hash for visual spec reuse.
   */
  static computeSpecHash(params: {
    locationId: string;
    themeKey: string;
    platform: TargetPlatformMedia;
    brandOverlay: BrandOverlayConfig;
  }): string {
    const raw = `${params.locationId}:${params.themeKey}:${params.platform}:${JSON.stringify(params.brandOverlay)}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Deterministically validates image dimensions against platform requirements.
   */
  static validateImageDimensions(platform: TargetPlatformMedia, width: number, height: number): void {
    const rule = PLATFORM_ASPECT_RULES[platform];
    if (width < rule.minWidth || height < rule.minHeight) {
      throw new ValidationFailedError(
        `Image dimensions ${width}x${height} are too small for ${platform}. Minimum required is ${rule.minWidth}x${rule.minHeight}.`
      );
    }

    const currentRatio = width / height;
    const ratioDelta = Math.abs(currentRatio - rule.recommendedRatio);
    // Allow up to 5% tolerance for aspect ratio rounding
    if (ratioDelta / rule.recommendedRatio > 0.05) {
      throw new ValidationFailedError(
        `Image aspect ratio ${width}:${height} violates required ${rule.aspectRatio} format for ${platform}.`
      );
    }
  }

  /**
   * Prepares and validates a social media image spec.
   * Enforces real photography for portfolio claims, mandatory AI labels, and asset reuse.
   */
  static prepareSocialImage(params: {
    locationId: string;
    category: SocialPostCategory;
    originType: ImageOriginType;
    platform: TargetPlatformMedia;
    width: number;
    height: number;
    altText: string;
    themeKey: string;
    realPhotoAssetId?: string;
    brandOverlay?: BrandOverlayConfig;
  }): { imageSpec: SocialImageSpec; billingIncurred: boolean } {
    // 1. Mandatory Real-Photo Rule for Portfolio Proof
    if (
      (params.category === 'PORTFOLIO_PROOF' || params.category === 'BEFORE_AFTER_SHOWCASE') &&
      params.originType !== 'APPROVED_REAL_PHOTO'
    ) {
      throw new ValidationFailedError(
        `Actual portfolio showcases (${params.category}) require verified approved real photography. AI-generated illustrations are prohibited for project proof.`
      );
    }

    // 2. Aspect Ratio and Dimension Verification
    this.validateImageDimensions(params.platform, params.width, params.height);

    // 3. Alt Text Requirement
    if (!params.altText || params.altText.trim().length < 10) {
      throw new ValidationFailedError('Alt text is required and must be at least 10 characters for accessibility.');
    }

    const brandOverlay = params.brandOverlay || { position: 'NONE', opacity: 0 };
    const specHash = this.computeSpecHash({
      locationId: params.locationId,
      themeKey: params.themeKey,
      platform: params.platform,
      brandOverlay
    });

    // 4. Asset Reuse Cache Lookup (Prevents duplicate generation billing)
    const cached = this.assetSpecCache.get(specHash);
    if (cached) {
      return {
        imageSpec: {
          ...cached,
          isReused: true
        },
        billingIncurred: false
      };
    }

    // 5. Rights Labeling
    const sourceRightsLabel =
      params.originType === 'AI_ILLUSTRATION'
        ? 'AI-Generated Conceptual Illustration - Not Actual Job Site'
        : 'Approved Client Real Photography - Verified Copyright';

    const rule = PLATFORM_ASPECT_RULES[params.platform];
    const imageSpec: SocialImageSpec = {
      id: randomUUID(),
      assetId: params.realPhotoAssetId || randomUUID(),
      originType: params.originType,
      platform: params.platform,
      width: params.width,
      height: params.height,
      aspectRatio: rule.aspectRatio,
      altText: params.altText,
      sourceRightsLabel,
      brandOverlay,
      isReused: false,
      specHash,
      createdAt: new Date().toISOString()
    };

    // Cache the prepared spec
    this.assetSpecCache.set(specHash, imageSpec);

    return {
      imageSpec,
      billingIncurred: params.originType === 'AI_ILLUSTRATION' // only new AI generation incurs billable credits
    };
  }
}
