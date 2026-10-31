import crypto from 'crypto';
import {
  ConsentRecord,
  ApprovalRecord,
  ConsentMode
} from '@localpilot/contracts';
import {
  ApprovalRequiredError,
  StaleRevisionError,
  UnsupportedActionError,
  ValidationFailedError
} from './errors.js';

export interface DispatchValidationInput {
  organizationId: string;
  locationId?: string;
  provider: string;
  actionType: string;
  itemId: string;
  currentPayload: Record<string, unknown>;
  currentFactsVersion: number;
}

export class ConsentService {
  private static consents = new Map<string, ConsentRecord>(); // key: orgId:locId:provider:action -> ConsentRecord
  private static approvals = new Map<string, ApprovalRecord>(); // key: orgId:itemId -> ApprovalRecord
  private static globalPause = new Map<string, boolean>(); // orgId -> boolean
  private static subscriptionTiers = new Map<string, string>(); // orgId -> tier

  static clear(): void {
    this.consents.clear();
    this.approvals.clear();
    this.globalPause.clear();
    this.subscriptionTiers.clear();
  }

  static computePayloadHash(payload: Record<string, unknown>): string {
    const serialized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  static setGlobalPause(organizationId: string, paused: boolean): void {
    this.globalPause.set(organizationId, paused);
  }

  static isGlobalPaused(organizationId: string): boolean {
    return this.globalPause.get(organizationId) || false;
  }

  static grantConsent(
    organizationId: string,
    locationId: string | undefined,
    provider: string,
    actionType: string,
    userId: string,
    mode: ConsentMode = 'review_first'
  ): ConsentRecord {
    const key = `${organizationId}:${locationId || 'all'}:${provider}:${actionType}`;
    const record: ConsentRecord = {
      id: crypto.randomUUID(),
      organizationId,
      locationId,
      provider,
      actionType,
      mode,
      isRevoked: false,
      isPaused: false,
      grantedByUserId: userId,
      grantedAt: new Date().toISOString()
    };

    this.consents.set(key, record);
    return record;
  }

  static revokeConsent(organizationId: string, locationId: string | undefined, provider: string, actionType: string): void {
    const key = `${organizationId}:${locationId || 'all'}:${provider}:${actionType}`;
    const existing = this.consents.get(key);
    if (existing) {
      existing.isRevoked = true;
      existing.revokedAt = new Date().toISOString();
    }
  }

  static setChannelPause(organizationId: string, locationId: string | undefined, provider: string, actionType: string, paused: boolean): void {
    const key = `${organizationId}:${locationId || 'all'}:${provider}:${actionType}`;
    const existing = this.consents.get(key);
    if (existing) {
      existing.isPaused = paused;
    }
  }

  static approveItem(
    organizationId: string,
    locationId: string | undefined,
    itemType: string,
    itemId: string,
    payload: Record<string, unknown>,
    currentFactsVersion: number,
    userId: string,
    isSensitiveChange: boolean = false
  ): ApprovalRecord {
    const key = `${organizationId}:${itemId}`;
    const record: ApprovalRecord = {
      id: crypto.randomUUID(),
      organizationId,
      locationId,
      itemType,
      itemId,
      approvedPayloadHash: this.computePayloadHash(payload),
      approvedFactsVersion: currentFactsVersion,
      isSensitiveChange,
      approvedByUserId: userId,
      approvedAt: new Date().toISOString()
    };

    this.approvals.set(key, record);
    return record;
  }

  /**
   * Subscription upgrade never silently enables automation (remains review-first).
   */
  static upgradeSubscription(organizationId: string, newTier: string): void {
    this.subscriptionTiers.set(organizationId, newTier);
    // Notice: Any existing consent records remain in 'review_first' mode!
  }

  /**
   * Validates consent, revision freshness, approval status, pause controls, and provider restrictions
   * before any external write is dispatched.
   */
  static validateDispatchAuthorization(input: DispatchValidationInput): void {
    // 1. Check Global Pause
    if (this.isGlobalPaused(input.organizationId)) {
      throw new ApprovalRequiredError(
        'Action blocked by Global Automation Pause',
        input.itemId,
        { reason: 'GLOBAL_PAUSE_ACTIVE' }
      );
    }

    // 2. Strict Gating: GBP Recurring-Action Features are explicitly disabled until verified
    if (input.provider === 'google_business_profile' && input.actionType.startsWith('recurring_')) {
      throw new UnsupportedActionError(
        input.actionType,
        'Google Business Profile recurring automated actions are disabled until direct API review consent is validated.'
      );
    }

    // 3. Check Channel / Provider Consent
    const consentKey = `${input.organizationId}:${input.locationId || 'all'}:${input.provider}:${input.actionType}`;
    const consent = this.consents.get(consentKey);

    if (!consent || consent.isRevoked) {
      throw new ApprovalRequiredError(
        `Consent missing or revoked for ${input.provider}:${input.actionType}`,
        input.itemId,
        { reason: 'CONSENT_REVOKED_OR_MISSING' }
      );
    }

    if (consent.isPaused) {
      throw new ApprovalRequiredError(
        `Channel pause is active for ${input.provider}:${input.actionType}`,
        input.itemId,
        { reason: 'CHANNEL_PAUSED' }
      );
    }

    // 4. Default Review-First: Must have an explicit approval
    const approvalKey = `${input.organizationId}:${input.itemId}`;
    const approval = this.approvals.get(approvalKey);

    if (!approval) {
      throw new ApprovalRequiredError(
        `Item ${input.itemId} requires explicit owner approval before publishing.`,
        input.itemId,
        { reason: 'PENDING_OWNER_APPROVAL' }
      );
    }

    // 5. Stale Content Revision Check: Payload modified after approval?
    const currentHash = this.computePayloadHash(input.currentPayload);
    if (currentHash !== approval.approvedPayloadHash) {
      throw new StaleRevisionError(
        approval.approvedPayloadHash.substring(0, 8),
        currentHash.substring(0, 8),
        { reason: 'CONTENT_MODIFIED_AFTER_APPROVAL' }
      );
    }

    // 6. Stale Business Facts Check: Facts version incremented after approval?
    if (input.currentFactsVersion > approval.approvedFactsVersion) {
      throw new StaleRevisionError(
        approval.approvedFactsVersion,
        input.currentFactsVersion,
        { reason: 'BUSINESS_FACTS_MODIFIED_AFTER_APPROVAL' }
      );
    }
  }
}
