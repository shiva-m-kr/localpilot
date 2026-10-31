import { createHash, randomUUID } from 'crypto';
import {
  ChannelVariant,
  ChannelPlatform,
  ChannelVariantPayload,
  ChannelVariantStatus
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ChannelVariantService {
  /**
   * Computes payload hash for approval binding.
   */
  static computePayloadHash(payload: ChannelVariantPayload): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  /**
   * Validates platform-specific constraints.
   */
  static validatePayload(platform: ChannelPlatform, payload: ChannelVariantPayload): void {
    if (platform === 'INSTAGRAM') {
      if (!payload.mediaAssetId) {
        throw new ValidationFailedError('Instagram publishing requires an approved image/media asset.');
      }
      if (payload.body.length > 2200) {
        throw new ValidationFailedError('Instagram captions cannot exceed 2200 characters.');
      }
    } else if (platform === 'GBP_POST') {
      if (payload.body.length > 1500) {
        throw new ValidationFailedError('Google Business Profile updates cannot exceed 1500 characters.');
      }
    } else if (platform === 'FACEBOOK') {
      if (payload.body.length > 5000) {
        throw new ValidationFailedError('Facebook posts cannot exceed 5000 characters.');
      }
    } else if (platform === 'WORDPRESS_BLOG') {
      if (!payload.title || payload.title.trim().length < 5) {
        throw new ValidationFailedError('WordPress blog posts require a title with at least 5 characters.');
      }
    }
  }

  /**
   * Creates an independent channel variant.
   */
  static createVariant(params: {
    campaignId: string;
    organizationId: string;
    locationId: string;
    platform: ChannelPlatform;
    destinationAccountId: string;
    payload: ChannelVariantPayload;
    requiresBlogUrl?: boolean;
    dependsOnVariantId?: string;
  }): ChannelVariant {
    this.validatePayload(params.platform, params.payload);

    const initialStatus: ChannelVariantStatus = params.requiresBlogUrl
      ? 'WAITING_ON_PREREQUISITE'
      : 'DRAFT';

    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      campaignId: params.campaignId,
      organizationId: params.organizationId,
      locationId: params.locationId,
      platform: params.platform,
      destinationAccountId: params.destinationAccountId,
      dependsOnVariantId: params.dependsOnVariantId,
      requiresBlogUrl: params.requiresBlogUrl ?? false,
      payload: params.payload,
      status: initialStatus,
      isApproved: false,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Approves a channel variant, freezing its payload hash.
   */
  static approveVariant(variant: ChannelVariant): ChannelVariant {
    if (variant.status === 'WAITING_ON_PREREQUISITE') {
      throw new ValidationFailedError(
        'Cannot approve variant while waiting on prerequisite live blog URL.'
      );
    }

    const payloadHash = this.computePayloadHash(variant.payload);
    return {
      ...variant,
      isApproved: true,
      approvedPayloadHash: payloadHash,
      status: 'APPROVED',
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Called when a blog post is verified published.
   * Unblocks all dependent social variants with the verified live URL.
   */
  static fulfillBlogPrerequisite(
    variants: ChannelVariant[],
    blogVariantId: string,
    verifiedLiveUrl: string
  ): ChannelVariant[] {
    return variants.map((variant) => {
      if (variant.dependsOnVariantId === blogVariantId && variant.requiresBlogUrl) {
        const updatedPayload: ChannelVariantPayload = {
          ...variant.payload,
          targetUrl: verifiedLiveUrl,
          callToAction: variant.payload.callToAction
            ? { ...variant.payload.callToAction, url: verifiedLiveUrl }
            : { label: 'Read Full Guide', url: verifiedLiveUrl, actionType: 'LEARN_MORE' }
        };

        const hash = this.computePayloadHash(updatedPayload);
        return {
          ...variant,
          payload: updatedPayload,
          prerequisiteVerifiedUrl: verifiedLiveUrl,
          requiresBlogUrl: false,
          isApproved: true,
          approvedPayloadHash: hash,
          status: 'APPROVED',
          updatedAt: new Date().toISOString()
        };
      }
      return variant;
    });
  }

  /**
   * Records failure for a specific destination without affecting others.
   */
  static recordVariantFailure(variant: ChannelVariant, reason: string): ChannelVariant {
    return {
      ...variant,
      status: 'FAILED',
      failureReason: reason,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Records verified publication outcome for a variant.
   */
  static recordVariantPublished(
    variant: ChannelVariant,
    outcome: { externalId: string; liveUrl?: string }
  ): ChannelVariant {
    return {
      ...variant,
      status: 'PUBLISHED',
      publishedExternalId: outcome.externalId,
      publishedLiveUrl: outcome.liveUrl,
      updatedAt: new Date().toISOString()
    };
  }
}
