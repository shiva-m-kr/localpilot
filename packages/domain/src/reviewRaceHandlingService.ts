import { randomUUID } from 'crypto';
import {
  ReviewReplyLease,
  RaceDiagnostic,
  ReviewResource
} from '@localpilot/contracts';

export class ReviewRaceHandlingService {
  private static activeLeases = new Map<string, ReviewReplyLease>(); // reviewResourceId -> Lease
  private static readonly MIN_READ_TO_WRITE_DELAY_MS = 1000; // 1s safety buffer in tests

  static reset(): void {
    this.activeLeases.clear();
  }

  /**
   * Acquires an exclusive lease on a review resource using local compare-and-swap logic.
   * Prevents worker concurrency races and duplicate publishing.
   */
  static acquireLease(params: {
    reviewResourceId: string;
    workerId: string;
    ttlSeconds?: number;
    nowIso?: string;
  }): { success: boolean; lease?: ReviewReplyLease; errorDiagnostic?: RaceDiagnostic } {
    const nowTime = new Date(params.nowIso || new Date().toISOString()).getTime();
    const existing = this.activeLeases.get(params.reviewResourceId);

    if (existing && existing.status === 'ACTIVE') {
      const expTime = new Date(existing.expiresAt).getTime();
      if (nowTime < expTime) {
        // Lease is actively held by another worker
        return {
          success: false,
          errorDiagnostic: {
            raceConditionDetected: true,
            conditionType: 'WORKER_LEASE_ACQUISITION_FAILED',
            diagnosticMessage: `Worker concurrency conflict: Lease already held by worker ${existing.workerId} until ${existing.expiresAt}.`,
            recoveryAction: 'PAUSE_JOB'
          }
        };
      }
    }

    const ttl = params.ttlSeconds || 30;
    const expiresAt = new Date(nowTime + ttl * 1000).toISOString();
    const version = existing ? existing.leaseVersion + 1 : 1;

    const lease: ReviewReplyLease = {
      leaseId: randomUUID(),
      reviewResourceId: params.reviewResourceId,
      workerId: params.workerId,
      acquiredAt: new Date(nowTime).toISOString(),
      expiresAt,
      leaseVersion: version,
      status: 'ACTIVE'
    };

    this.activeLeases.set(params.reviewResourceId, lease);
    return { success: true, lease };
  }

  static releaseLease(reviewResourceId: string, leaseId: string): void {
    const existing = this.activeLeases.get(reviewResourceId);
    if (existing && existing.leaseId === leaseId) {
      existing.status = 'RELEASED';
      this.activeLeases.delete(reviewResourceId);
    }
  }

  /**
   * Verifies inflight preconditions immediately before dispatching external write.
   * Identifies exact race conditions: edits during wait, manual provider replies, removals, consent revocation, or token loss.
   */
  static verifyInflightPreconditions(params: {
    initialReadTimestampIso: string;
    expectedSourceRevision: string;
    currentLiveReview: ReviewResource | null;
    isConsentRevoked: boolean;
    isTokenValid: boolean;
    nowIso?: string;
  }): RaceDiagnostic {
    // 1. Consent revocation inflight
    if (params.isConsentRevoked) {
      return {
        raceConditionDetected: true,
        conditionType: 'CONSENT_REVOKED_INFLIGHT',
        diagnosticMessage: 'Owner consent was revoked while reply publication was in flight. Aborting operation.',
        recoveryAction: 'ABORT_INFLIGHT'
      };
    }

    // 2. Token loss / auth revoked inflight
    if (!params.isTokenValid) {
      return {
        raceConditionDetected: true,
        conditionType: 'INTEGRATION_TOKEN_LOST',
        diagnosticMessage: 'Integration OAuth token was revoked or expired while job was waiting to write.',
        recoveryAction: 'PAUSE_JOB'
      };
    }

    // 3. Removed resource on provider
    if (!params.currentLiveReview || params.currentLiveReview.isDeleted) {
      return {
        raceConditionDetected: true,
        conditionType: 'RESOURCE_REMOVED_OR_DELETED',
        diagnosticMessage: 'Target review was removed or deleted on the provider platform before publication.',
        recoveryAction: 'ABORT_INFLIGHT'
      };
    }

    // 4. Manual provider-side reply added during the wait
    if (params.currentLiveReview.existingReply) {
      return {
        raceConditionDetected: true,
        conditionType: 'MANUAL_PROVIDER_REPLY_DETECTED',
        diagnosticMessage: `Manual reply was published directly on Google during the wait buffer: "${params.currentLiveReview.existingReply.comment}".`,
        recoveryAction: 'ABORT_INFLIGHT'
      };
    }

    // 5. Customer edited review rating or comment during the wait (stale source)
    if (params.currentLiveReview.sourceRevision !== params.expectedSourceRevision) {
      return {
        raceConditionDetected: true,
        conditionType: 'STALE_SOURCE_MODIFIED_DURING_WAIT',
        diagnosticMessage: 'Customer modified their review rating or comment during the read-to-write delay window.',
        recoveryAction: 'PAUSE_JOB'
      };
    }

    return {
      raceConditionDetected: false,
      conditionType: null,
      diagnosticMessage: 'Preconditions verified: no race conditions detected.',
      recoveryAction: 'ENTER_RECONCILIATION' // default clean
    };
  }
}
