export interface GooglePubSubNotificationPayload {
  subscription: string;
  message: {
    data: string; // base64 JSON
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
}

export type ReviewNotificationType = 'NEW_REVIEW' | 'UPDATED_REVIEW' | 'DELETED_REVIEW';

export type NotificationReconciliationStatus =
  | 'PENDING_REFRESH'
  | 'REFRESHED'
  | 'REJECTED_FOREIGN_ACCOUNT'
  | 'SKIPPED_DUPLICATE';

export interface ReviewNotificationEvent {
  eventId: string;
  organizationId: string;
  locationId: string;
  provider: 'google_business_profile';
  eventType: ReviewNotificationType;
  externalResourceId: string;
  publishedAt: string;
  receivedAt: string;
  deliveryLatencyMs: number;
  reconciliationStatus: NotificationReconciliationStatus;
  reconciledAt: string | null;
  refreshedRevision: string | null;
}

export interface PollingReconciliationJob {
  locationId: string;
  lastPolledAt: string;
  reconciledReviewsCount: number;
  outOfOrderCaughtCount: number;
}
