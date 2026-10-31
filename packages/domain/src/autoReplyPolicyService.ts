import { randomUUID } from 'crypto';
import {
  AutoReplyMode,
  AutoReplyPolicyConfig,
  AutoReplyEvaluation,
  ReviewResource,
  ReviewClassificationResult
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class AutoReplyPolicyService {
  private static policies = new Map<string, AutoReplyPolicyConfig>();

  static reset(): void {
    this.policies.clear();
  }

  /**
   * Configures policy with recorded owner consent, sample previews, language allowlist, delay and daily caps.
   */
  static configurePolicy(params: {
    organizationId: string;
    locationId: string;
    provider: 'google_business_profile';
    mode: AutoReplyMode;
    ownerConsentUserId?: string;
    providerRequirementsMet: boolean;
    languageAllowlist?: string[];
    minDelayMinutes?: number;
    dailyCap?: number;
  }): AutoReplyPolicyConfig {
    const key = `${params.organizationId}:${params.locationId}:${params.provider}`;

    // Automatic mode stays disabled until current provider requirements and owner consent are met
    if (params.mode === 'ELIGIBLE_POSITIVE_AUTO') {
      if (!params.providerRequirementsMet) {
        throw new ValidationFailedError(
          'Cannot enable ELIGIBLE_POSITIVE_AUTO: Provider requirements are not satisfied (active verified GBP connection required).'
        );
      }
      if (!params.ownerConsentUserId) {
        throw new ValidationFailedError(
          'Cannot enable ELIGIBLE_POSITIVE_AUTO: Explicit recorded owner consent is required.'
        );
      }
    }

    const nowIso = new Date().toISOString();
    const policy: AutoReplyPolicyConfig = {
      policyId: randomUUID(),
      organizationId: params.organizationId,
      locationId: params.locationId,
      provider: params.provider,
      mode: params.mode,
      ownerConsentRecordedAt: params.ownerConsentUserId ? nowIso : null,
      ownerConsentUserId: params.ownerConsentUserId || null,
      isConsentRevoked: false,
      languageAllowlist: params.languageAllowlist || ['en'],
      minDelayMinutes: params.minDelayMinutes ?? 15,
      dailyCap: params.dailyCap ?? 5,
      todayAutoCount: 0,
      providerRequirementsMet: params.providerRequirementsMet,
      updatedAt: nowIso
    };

    this.policies.set(key, policy);
    return policy;
  }

  /**
   * Revokes owner consent immediately and downgrades mode to DRAFT_ONLY.
   */
  static revokeConsent(organizationId: string, locationId: string): AutoReplyPolicyConfig {
    const key = `${organizationId}:${locationId}:google_business_profile`;
    const policy = this.policies.get(key);
    if (!policy) {
      throw new ValidationFailedError(`Policy for location ${locationId} not found.`);
    }

    policy.isConsentRevoked = true;
    policy.mode = 'DRAFT_ONLY';
    policy.ownerConsentRecordedAt = null;
    policy.ownerConsentUserId = null;
    policy.updatedAt = new Date().toISOString();

    this.policies.set(key, policy);
    return policy;
  }

  /**
   * Evaluates whether a review is eligible for automatic publication under current policy.
   * Enforces:
   * 1. Positive uncomplicated text PLUS rating
   * 2. RATING ALONE NEVER AUTHORIZES PUBLICATION
   * 3. Complaint/sarcasm/privacy/sensitive cases and unsupported language ALWAYS require review
   * 4. Delay and daily caps
   */
  static evaluateReviewForAutoReply(params: {
    policy: AutoReplyPolicyConfig;
    review: ReviewResource;
    classification: ReviewClassificationResult;
    asOfDateIso?: string;
  }): AutoReplyEvaluation {
    const { policy, review, classification } = params;

    if (policy.mode !== 'ELIGIBLE_POSITIVE_AUTO') {
      return {
        isEligibleForAutoPublish: false,
        reason: `Policy mode is set to ${policy.mode} (manual approval required)`,
        scheduledPublishAt: null,
        requiredMode: policy.mode
      };
    }

    if (policy.isConsentRevoked || !policy.providerRequirementsMet) {
      return {
        isEligibleForAutoPublish: false,
        reason: 'Consent revoked or provider requirements not met',
        scheduledPublishAt: null,
        requiredMode: 'DRAFT_ONLY'
      };
    }

    // Acceptance rule: Rating alone NEVER authorizes publication
    if (classification.isRatingOnly) {
      return {
        isEligibleForAutoPublish: false,
        reason: 'Rating-only review cannot be auto-published: requires positive uncomplicated text',
        scheduledPublishAt: null,
        requiredMode: 'APPROVE_EACH'
      };
    }

    // Must be positive sentiment
    if (classification.sentiment !== 'positive') {
      return {
        isEligibleForAutoPublish: false,
        reason: `Review sentiment is ${classification.sentiment}: requires human review`,
        scheduledPublishAt: null,
        requiredMode: 'APPROVE_EACH'
      };
    }

    // Must have 4 or 5 stars
    if (review.rating < 4) {
      return {
        isEligibleForAutoPublish: false,
        reason: `Rating is ${review.rating} stars: below minimum 4-star auto threshold`,
        scheduledPublishAt: null,
        requiredMode: 'APPROVE_EACH'
      };
    }

    // Risk flags check (complaint, sarcasm, privacy, safety, etc.)
    if (classification.riskFlags.length > 0 || classification.requiresHumanHold) {
      return {
        isEligibleForAutoPublish: false,
        reason: `Active risk flags detected (${classification.riskFlags.join(', ')}): held for human review`,
        scheduledPublishAt: null,
        requiredMode: 'APPROVE_EACH'
      };
    }

    // Language allowlist check
    if (!policy.languageAllowlist.includes(classification.language.code)) {
      return {
        isEligibleForAutoPublish: false,
        reason: `Language '${classification.language.code}' is not in allowlist (${policy.languageAllowlist.join(', ')})`,
        scheduledPublishAt: null,
        requiredMode: 'APPROVE_EACH'
      };
    }

    // Daily cap check
    if (policy.todayAutoCount >= policy.dailyCap) {
      return {
        isEligibleForAutoPublish: false,
        reason: `Daily auto-reply cap (${policy.dailyCap}) reached for today`,
        scheduledPublishAt: null,
        requiredMode: 'APPROVE_EACH'
      };
    }

    // Calculate scheduled delivery time with mandatory delay window
    const nowTime = new Date(params.asOfDateIso || new Date().toISOString()).getTime();
    const scheduledPublishAt = new Date(nowTime + policy.minDelayMinutes * 60 * 1000).toISOString();

    policy.todayAutoCount++;

    return {
      isEligibleForAutoPublish: true,
      reason: `Eligible positive review: scheduled with ${policy.minDelayMinutes}m buffer`,
      scheduledPublishAt,
      requiredMode: 'ELIGIBLE_POSITIVE_AUTO'
    };
  }

  static getPolicy(organizationId: string, locationId: string): AutoReplyPolicyConfig | undefined {
    return this.policies.get(`${organizationId}:${locationId}:google_business_profile`);
  }
}
