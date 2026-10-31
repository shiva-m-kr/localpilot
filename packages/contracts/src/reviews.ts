export type ReviewProvider = 'google_business_profile' | 'facebook' | 'direct';

export interface ReviewExistingReply {
  comment: string;
  updateTime: string;
}

export interface ReviewResource {
  id: string;
  organizationId: string;
  locationId: string;
  provider: ReviewProvider;
  externalResourceId: string;
  reviewerName: string;
  rating: number; // 1 to 5
  comment: string | null;
  sourceRevision: string;
  fetchedAt: string;
  expiresAt: string;
  existingReply: ReviewExistingReply | null;
  isDeleted: boolean;
  purgedAt: string | null;
}

export type ReviewSentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

export interface EphemeralReviewAssessment {
  id: string;
  reviewResourceId: string;
  sourceRevision: string;
  sentiment: ReviewSentiment;
  topics: string[];
  riskFlags: string[];
  language: string;
  confidence: number;
  expiresAt: string;
}

export type ReplyDraftStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENDING'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'STALE';

export type ReplyAuthorType = 'OWNER' | 'AI_ASSISTED' | 'STAFF';

export interface OwnerReplyDraft {
  id: string;
  organizationId: string;
  locationId: string;
  reviewResourceId: string;
  sourceRevisionHash: string;
  draftText: string;
  authorType: ReplyAuthorType;
  authorUserId: string;
  version: number;
  status: ReplyDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyApproval {
  id: string;
  draftId: string;
  approvedByUserId: string;
  approvedAt: string;
  consentScope: string;
  approvedRevisionHash: string;
}

export type PublicationAttemptStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';

export interface ReplyPublicationAttempt {
  id: string;
  draftId: string;
  reviewResourceId: string;
  attemptedAt: string;
  status: PublicationAttemptStatus;
  externalResponseId: string | null;
  errorMessage: string | null;
}
