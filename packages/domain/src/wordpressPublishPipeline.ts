import { createHash, randomUUID } from 'crypto';
import {
  ApprovalRequiredError,
  StaleRevisionError,
  ValidationFailedError,
  UnknownExternalOutcomeError
} from './errors.js';
import { BudgetService } from './budgetService.js';
import { WordPressAdapter } from '@localpilot/integrations';

export interface WordPressPublishRequest {
  organizationId: string;
  locationId: string;
  draftId: string;
  revisionNumber: number;
  payloadHash: string;
  title: string;
  content: string;
  existingExternalPostId?: string;
  isPaused: boolean;
  hasActiveConsent: boolean;
  credentials: {
    siteUrl: string;
    username: string;
    applicationPassword: string;
  };
}

export interface WordPressPublishOutcome {
  externalId: string;
  publishedUrl: string;
  publishedAt: string;
  verifiedViaReadback: boolean;
  idempotencyKey: string;
  isDuplicateCall: boolean;
  budgetReservationId: string;
}

export class WordPressPublishPipeline {
  private static completedDispatches = new Map<string, WordPressPublishOutcome>();
  private static adapter = new WordPressAdapter();

  /**
   * Resets dispatch map for isolated testing.
   */
  static reset(): void {
    this.completedDispatches.clear();
  }

  /**
   * Generates deterministic idempotency key for WordPress post dispatch.
   */
  static computeIdempotencyKey(req: WordPressPublishRequest): string {
    const raw = `${req.organizationId}:${req.locationId}:${req.draftId}:rev${req.revisionNumber}:${req.payloadHash}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Executes the full end-to-end publish slice.
   */
  static async executePublishSlice(req: WordPressPublishRequest): Promise<WordPressPublishOutcome> {
    // 1. Recheck Pause and Consent state before dispatch
    if (req.isPaused) {
      throw new ApprovalRequiredError(
        'location_publish_state',
        req.locationId,
        { reason: 'Location publishing is paused. Unpause location before dispatching scheduled posts.' }
      );
    }
    if (!req.hasActiveConsent) {
      throw new ApprovalRequiredError(
        'consent_policy',
        req.locationId,
        { reason: 'Active publishing consent is required. Please re-consent to enable external WordPress dispatch.' }
      );
    }

    // 2. Validate payload hash matches title & content
    const currentHash = createHash('sha256')
      .update(JSON.stringify({ title: req.title, content: req.content }))
      .digest('hex');
    if (currentHash !== req.payloadHash) {
      throw new StaleRevisionError(
        req.payloadHash,
        currentHash,
        { reason: 'Approved revision payload hash does not match current content' }
      );
    }

    // 3. Idempotency Check
    const idempotencyKey = this.computeIdempotencyKey(req);
    const existingOutcome = this.completedDispatches.get(idempotencyKey);
    if (existingOutcome) {
      return {
        ...existingOutcome,
        isDuplicateCall: true
      };
    }

    // 4. Reserve Budget atomically
    const reservation = BudgetService.reserveCredits({
      organizationId: req.organizationId,
      provider: 'wordpress',
      operation: 'PUBLISH_WORDPRESS_POST',
      estimatedCredits: 1,
      estimatedCostMicros: 50000, // $0.05
      currency: 'USD',
      idempotencyKey: `res_${idempotencyKey}`
    });

    try {
      // 5. Worker Publish (or Update if existingExternalPostId provided)
      let externalId: string;
      let publishedUrl: string;
      let publishedAt: string;

      if (req.existingExternalPostId) {
        // Later edit uses the stored external ID!
        const updateResult = await this.adapter.updatePost(
          req.credentials,
          req.existingExternalPostId,
          {
            title: req.title,
            content: req.content
          }
        );
        externalId = updateResult.externalId;
        publishedUrl = updateResult.publishedUrl;
        publishedAt = updateResult.publishedAt;
      } else {
        const publishResult = await this.adapter.publish(req.credentials, {
          itemId: req.draftId,
          title: req.title,
          content: req.content,
          mediaUrls: [],
          mediaMimeTypes: []
        });
        externalId = publishResult.externalId;
        publishedUrl = publishResult.publishedUrl;
        publishedAt = publishResult.publishedAt;
      }

      // 6. External Readback Verification
      const readback = await this.adapter.reconcile(req.credentials, externalId);
      if (readback.state !== 'confirmed_published') {
        throw new UnknownExternalOutcomeError(
          'wordpress',
          externalId,
          { readbackState: readback.state, notes: readback.notes }
        );
      }

      // 7. Commit budget reservation upon verified readback
      BudgetService.finalizeReservation(reservation.id, 1);

      const outcome: WordPressPublishOutcome = {
        externalId,
        publishedUrl,
        publishedAt,
        verifiedViaReadback: true,
        idempotencyKey,
        isDuplicateCall: false,
        budgetReservationId: reservation.id
      };

      this.completedDispatches.set(idempotencyKey, outcome);
      return outcome;
    } catch (err) {
      BudgetService.releaseReservation(reservation.id, 'Publish failed or unverified');
      throw err;
    }
  }
}
