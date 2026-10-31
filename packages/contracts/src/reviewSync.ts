import { ReviewProvider, ReviewExistingReply } from './reviews.js';

export type ReviewSyncStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface ExternalReviewPayload {
  externalResourceId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  existingReply: ReviewExistingReply | null;
  createTime: string;
  updateTime: string;
}

export interface ReviewSyncCheckpoint {
  id: string;
  organizationId: string;
  locationId: string;
  provider: ReviewProvider;
  lastSyncStartedAt: string;
  lastSyncCompletedAt: string | null;
  status: ReviewSyncStatus;
  nextPageToken: string | null;
  syncedReviewCount: number;
  totalObservedInProvider: number | null;
  isLifetimeHistoryComplete: boolean;
  pagesProcessed: number;
  errorMessage: string | null;
}

export interface ReviewSyncResult {
  checkpoint: ReviewSyncCheckpoint;
  upsertedCount: number;
  revisionChangesCount: number;
  removedCount: number;
  existingRepliesProtected: number;
  isLifetimeHistoryComplete: boolean;
}
