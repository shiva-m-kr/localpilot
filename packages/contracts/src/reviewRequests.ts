export type ReviewRequestDeliveryStatus =
  | 'QUEUED'
  | 'SUPPRESSED_NO_CONSENT'
  | 'SUPPRESSED_OPTED_OUT'
  | 'SUPPRESSED_FREQUENCY_CAP'
  | 'SUPPRESSED_QUIET_HOURS'
  | 'OUTBOUND_ADAPTER_DISABLED'
  | 'SENT'
  | 'CLICKED'
  | 'DUPLICATE_TRANSACTION_IGNORED';

export interface ReviewRequestTrigger {
  transactionId: string;
  organizationId: string;
  locationId: string;
  customerIdentifier: string; // Hashed/tokenized phone or email
  completedAt: string;
  hasContactConsent: boolean;
  isOptedOut: boolean;
  customerSentimentHint?: 'satisfied' | 'neutral' | 'dissatisfied'; // Used to prove NO selective filtering
}

export interface ReviewRequestRecord {
  requestId: string;
  transactionId: string;
  organizationId: string;
  locationId: string;
  customerIdentifier: string;
  status: ReviewRequestDeliveryStatus;
  scheduledSendAt: string | null;
  sentAt: string | null;
  clickedAt: string | null;
  isVerifiedGoogleReview: false; // Must NEVER falsely claim clicks are verified Google reviews
  createdAt: string;
}
