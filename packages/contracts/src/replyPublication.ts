export type ReplyPublicationState =
  | 'PRECHECK_PASSED'
  | 'SENT_PENDING_READBACK'
  | 'READBACK_CONFIRMED'
  | 'OVERWRITE_PREVENTED'
  | 'TIMEOUT_RECONCILING'
  | 'FAILED'
  | 'REPLY_DELETED';

export interface ReplyPublicationRequest {
  organizationId: string;
  locationId: string;
  reviewResourceId: string;
  draftId: string;
  approvalId: string;
  replyText: string;
  forceOverwriteDifferentReply?: boolean;
}

export interface ReplyPublicationResult {
  attemptId: string;
  reviewResourceId: string;
  state: ReplyPublicationState;
  businessReplyComment: string | null;
  customerReviewComment: string | null;
  readbackConfirmedAt: string | null;
  errorMessage: string | null;
}
