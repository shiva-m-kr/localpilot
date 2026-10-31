import { randomUUID } from 'crypto';
import {
  GooglePubSubNotificationPayload,
  ReviewNotificationEvent,
  ExternalReviewPayload
} from '@localpilot/contracts';
import { ReviewService } from './reviewService.js';
import { ValidationFailedError } from './errors.js';

export interface AuthorizedLocationBinding {
  organizationId: string;
  locationId: string;
  googleLocationName: string; // e.g. "accounts/123/locations/456"
}

export class ReviewNotificationService {
  private static processedMessageIds = new Set<string>();
  private static events = new Map<string, ReviewNotificationEvent>();
  private static locationBindings = new Map<string, AuthorizedLocationBinding>();

  static reset(): void {
    this.processedMessageIds.clear();
    this.events.clear();
    this.locationBindings.clear();
  }

  static registerLocationBinding(binding: AuthorizedLocationBinding): void {
    this.locationBindings.set(binding.googleLocationName, binding);
  }

  /**
   * Ingests a push notification from Google Pub/Sub.
   * Validates account binding, deduplicates, calculates latency, and triggers an authorized review refresh.
   */
  static handlePubSubNotification(
    payload: GooglePubSubNotificationPayload,
    authorizedFetcher: (externalResourceId: string) => ExternalReviewPayload | null,
    receivedAtIso = new Date().toISOString()
  ): ReviewNotificationEvent {
    const { message } = payload;
    if (!message || !message.messageId) {
      throw new ValidationFailedError('Invalid PubSub payload: missing message or messageId.');
    }

    // 1. Deduplication check
    if (this.processedMessageIds.has(message.messageId)) {
      const existing = Array.from(this.events.values()).find(
        (e) => e.eventId === message.messageId
      );
      if (existing) {
        return {
          ...existing,
          reconciliationStatus: 'SKIPPED_DUPLICATE'
        };
      }
    }
    this.processedMessageIds.add(message.messageId);

    // Decode base64 payload
    let decodedData: any;
    try {
      const jsonStr = Buffer.from(message.data, 'base64').toString('utf-8');
      decodedData = JSON.parse(jsonStr);
    } catch {
      throw new ValidationFailedError('Failed to parse base64 JSON PubSub message data.');
    }

    // Google review notification data typically contains resourceName, e.g. "accounts/123/locations/456/reviews/rev_789"
    const resourceName = decodedData.resourceName || decodedData.reviewName || '';
    const locationName = resourceName.split('/reviews/')[0];

    // 2. Foreign account validation
    const binding = this.locationBindings.get(locationName);
    const publishTime = new Date(message.publishTime).getTime();
    const receiveTime = new Date(receivedAtIso).getTime();
    const deliveryLatencyMs = Math.max(0, receiveTime - publishTime);

    if (!binding) {
      const rejectedEvent: ReviewNotificationEvent = {
        eventId: message.messageId,
        organizationId: 'UNKNOWN',
        locationId: 'UNKNOWN',
        provider: 'google_business_profile',
        eventType: decodedData.eventType || 'NEW_REVIEW',
        externalResourceId: resourceName,
        publishedAt: message.publishTime,
        receivedAt: receivedAtIso,
        deliveryLatencyMs,
        reconciliationStatus: 'REJECTED_FOREIGN_ACCOUNT',
        reconciledAt: null,
        refreshedRevision: null
      };
      this.events.set(message.messageId, rejectedEvent);
      return rejectedEvent;
    }

    // 3. DO NOT trust notification payload as final review text!
    // Fetch authorized live review from provider endpoint
    const liveReview = authorizedFetcher(resourceName);
    let refreshedRevision: string | null = null;

    if (liveReview) {
      const { resource } = ReviewService.upsertReviewResource({
        organizationId: binding.organizationId,
        locationId: binding.locationId,
        provider: 'google_business_profile',
        externalResourceId: liveReview.externalResourceId,
        reviewerName: liveReview.reviewerName,
        rating: liveReview.rating,
        comment: liveReview.comment,
        existingReply: liveReview.existingReply,
        fetchedAtIso: receivedAtIso
      });
      refreshedRevision = resource.sourceRevision;
    }

    const event: ReviewNotificationEvent = {
      eventId: message.messageId,
      organizationId: binding.organizationId,
      locationId: binding.locationId,
      provider: 'google_business_profile',
      eventType: decodedData.eventType || 'NEW_REVIEW',
      externalResourceId: resourceName,
      publishedAt: message.publishTime,
      receivedAt: receivedAtIso,
      deliveryLatencyMs,
      reconciliationStatus: 'REFRESHED',
      reconciledAt: new Date().toISOString(),
      refreshedRevision
    };

    this.events.set(message.messageId, event);
    return event;
  }

  /**
   * Bounded polling reconciliation: recovers missed or out-of-order events.
   */
  static runPollingReconciliation(params: {
    organizationId: string;
    locationId: string;
    recentlyUpdatedReviews: ExternalReviewPayload[];
  }): { reconciledCount: number } {
    let reconciledCount = 0;
    const nowIso = new Date().toISOString();

    for (const rev of params.recentlyUpdatedReviews) {
      const { revisionChanged } = ReviewService.upsertReviewResource({
        organizationId: params.organizationId,
        locationId: params.locationId,
        provider: 'google_business_profile',
        externalResourceId: rev.externalResourceId,
        reviewerName: rev.reviewerName,
        rating: rev.rating,
        comment: rev.comment,
        existingReply: rev.existingReply,
        fetchedAtIso: nowIso
      });
      reconciledCount++;
    }

    return { reconciledCount };
  }

  static getEvent(eventId: string): ReviewNotificationEvent | undefined {
    return this.events.get(eventId);
  }
}
