import { randomUUID } from 'crypto';
import {
  ReviewProvider,
  ReviewSyncCheckpoint,
  ReviewSyncResult,
  ExternalReviewPayload
} from '@localpilot/contracts';
import { ReviewService } from './reviewService.js';
import { ValidationFailedError } from './errors.js';

export class ReviewSyncService {
  private static checkpoints = new Map<string, ReviewSyncCheckpoint>();
  private static processedPageTokens = new Set<string>();

  // Maximum pages processed per sync run to enforce quota boundaries
  public static readonly MAX_PAGES_PER_SYNC = 5;

  static reset(): void {
    this.checkpoints.clear();
    this.processedPageTokens.clear();
  }

  /**
   * Performs an authorized bounded review sync slice for a location.
   */
  static processSyncSlice(params: {
    organizationId: string;
    locationId: string;
    provider: ReviewProvider;
    pages: Array<{
      pageToken?: string;
      nextPageToken?: string;
      reviews: ExternalReviewPayload[];
      totalInAccount?: number;
    }>;
    isSamplingApi?: boolean; // If provider API only provides sampled reviews
  }): ReviewSyncResult {
    const key = `${params.organizationId}:${params.locationId}:${params.provider}`;
    let checkpoint = this.checkpoints.get(key);
    const nowIso = new Date().toISOString();

    if (!checkpoint) {
      checkpoint = {
        id: randomUUID(),
        organizationId: params.organizationId,
        locationId: params.locationId,
        provider: params.provider,
        lastSyncStartedAt: nowIso,
        lastSyncCompletedAt: null,
        status: 'IN_PROGRESS',
        nextPageToken: null,
        syncedReviewCount: 0,
        totalObservedInProvider: null,
        isLifetimeHistoryComplete: false,
        pagesProcessed: 0,
        errorMessage: null
      };
    } else {
      checkpoint.lastSyncStartedAt = nowIso;
      checkpoint.status = 'IN_PROGRESS';
    }

    let upsertedCount = 0;
    let revisionChangesCount = 0;
    let existingRepliesProtected = 0;
    let pagesProcessed = 0;

    for (const page of params.pages) {
      if (pagesProcessed >= this.MAX_PAGES_PER_SYNC) {
        checkpoint.status = 'PARTIAL';
        break;
      }

      // Guard duplicate page token
      const pageKey = `${key}:${page.pageToken || 'root'}`;
      if (this.processedPageTokens.has(pageKey)) {
        continue;
      }
      this.processedPageTokens.add(pageKey);
      pagesProcessed++;

      if (page.totalInAccount !== undefined) {
        checkpoint.totalObservedInProvider = page.totalInAccount;
      }

      for (const rev of page.reviews) {
        const { resource, revisionChanged } = ReviewService.upsertReviewResource({
          organizationId: params.organizationId,
          locationId: params.locationId,
          provider: params.provider,
          externalResourceId: rev.externalResourceId,
          reviewerName: rev.reviewerName,
          rating: rev.rating,
          comment: rev.comment,
          existingReply: rev.existingReply,
          fetchedAtIso: nowIso
        });

        upsertedCount++;
        if (revisionChanged) revisionChangesCount++;
        if (rev.existingReply) existingRepliesProtected++;
      }

      checkpoint.nextPageToken = page.nextPageToken || null;
      checkpoint.syncedReviewCount += page.reviews.length;
    }

    checkpoint.pagesProcessed += pagesProcessed;

    // Check if lifetime history is complete
    const hasMorePages = !!checkpoint.nextPageToken;
    const isSampled = !!params.isSamplingApi;

    if (!hasMorePages && !isSampled) {
      checkpoint.status = 'COMPLETED';
      checkpoint.isLifetimeHistoryComplete = true;
      checkpoint.lastSyncCompletedAt = new Date().toISOString();
    } else {
      checkpoint.status = 'PARTIAL';
      checkpoint.isLifetimeHistoryComplete = false;
      checkpoint.lastSyncCompletedAt = new Date().toISOString();
    }

    this.checkpoints.set(key, checkpoint);

    return {
      checkpoint: { ...checkpoint },
      upsertedCount,
      revisionChangesCount,
      removedCount: 0,
      existingRepliesProtected,
      isLifetimeHistoryComplete: checkpoint.isLifetimeHistoryComplete
    };
  }

  /**
   * Handles explicit review removals reported by provider or discovered during reconciliation.
   */
  static handleRemovedReview(params: {
    organizationId: string;
    locationId: string;
    externalResourceId: string;
  }): boolean {
    const key = `${params.organizationId}:${params.locationId}:google_business_profile`;
    // Find the review resource and mark it deleted/purged
    for (const [id, res] of (ReviewService as any).reviewResources.entries()) {
      if (
        res.organizationId === params.organizationId &&
        res.locationId === params.locationId &&
        res.externalResourceId === params.externalResourceId
      ) {
        res.isDeleted = true;
        res.comment = null;
        res.purgedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  static getCheckpoint(
    organizationId: string,
    locationId: string,
    provider: ReviewProvider
  ): ReviewSyncCheckpoint | undefined {
    return this.checkpoints.get(`${organizationId}:${locationId}:${provider}`);
  }
}
