import { randomUUID } from 'crypto';
import {
  ReviewRequestTrigger,
  ReviewRequestRecord,
  ReviewRequestDeliveryStatus
} from '@localpilot/contracts';

export class ReviewRequestWorkflowService {
  private static records = new Map<string, ReviewRequestRecord>();
  private static processedTransactions = new Set<string>();
  private static customerSentTimestamps = new Map<string, number>(); // customerId -> last sent epoch ms

  // Flag gating outbound messaging until market authorization / credentials verified
  public static isOutboundAdapterEnabled = false;

  public static readonly FREQUENCY_CAP_DAYS = 90;

  static reset(): void {
    this.records.clear();
    this.processedTransactions.clear();
    this.customerSentTimestamps.clear();
    this.isOutboundAdapterEnabled = false;
  }

  /**
   * Evaluates and queues a review request workflow trigger.
   * Enforces:
   * 1. Objective eligibility: Never filters out customers based on sentiment hints
   * 2. Transaction deduplication
   * 3. Opt-out and contact consent checks
   * 4. 90-day frequency caps
   * 5. Quiet hours protection
   * 6. Outbound adapter authorization state
   */
  static processTransactionTrigger(
    trigger: ReviewRequestTrigger,
    asOfDateIso = new Date().toISOString(),
    customerLocalHour = 14 // 2 PM default
  ): ReviewRequestRecord {
    const requestId = randomUUID();
    const asOfTime = new Date(asOfDateIso).getTime();

    // 1. Transaction Deduplication: Repeated events for same transactionId send at most 1 invitation
    if (this.processedTransactions.has(trigger.transactionId)) {
      const dupRecord: ReviewRequestRecord = {
        requestId,
        transactionId: trigger.transactionId,
        organizationId: trigger.organizationId,
        locationId: trigger.locationId,
        customerIdentifier: trigger.customerIdentifier,
        status: 'DUPLICATE_TRANSACTION_IGNORED',
        scheduledSendAt: null,
        sentAt: null,
        clickedAt: null,
        isVerifiedGoogleReview: false,
        createdAt: asOfDateIso
      };
      this.records.set(requestId, dupRecord);
      return dupRecord;
    }

    // 2. Opt-out check
    if (trigger.isOptedOut) {
      const optOutRecord: ReviewRequestRecord = {
        requestId,
        transactionId: trigger.transactionId,
        organizationId: trigger.organizationId,
        locationId: trigger.locationId,
        customerIdentifier: trigger.customerIdentifier,
        status: 'SUPPRESSED_OPTED_OUT',
        scheduledSendAt: null,
        sentAt: null,
        clickedAt: null,
        isVerifiedGoogleReview: false,
        createdAt: asOfDateIso
      };
      this.records.set(requestId, optOutRecord);
      return optOutRecord;
    }

    // 3. Contact consent check
    if (!trigger.hasContactConsent) {
      const noConsentRecord: ReviewRequestRecord = {
        requestId,
        transactionId: trigger.transactionId,
        organizationId: trigger.organizationId,
        locationId: trigger.locationId,
        customerIdentifier: trigger.customerIdentifier,
        status: 'SUPPRESSED_NO_CONSENT',
        scheduledSendAt: null,
        sentAt: null,
        clickedAt: null,
        isVerifiedGoogleReview: false,
        createdAt: asOfDateIso
      };
      this.records.set(requestId, noConsentRecord);
      return noConsentRecord;
    }

    // 4. Frequency cap check (90 days)
    const lastSent = this.customerSentTimestamps.get(trigger.customerIdentifier);
    if (lastSent) {
      const diffDays = (asOfTime - lastSent) / (24 * 60 * 60 * 1000);
      if (diffDays < this.FREQUENCY_CAP_DAYS) {
        const freqRecord: ReviewRequestRecord = {
          requestId,
          transactionId: trigger.transactionId,
          organizationId: trigger.organizationId,
          locationId: trigger.locationId,
          customerIdentifier: trigger.customerIdentifier,
          status: 'SUPPRESSED_FREQUENCY_CAP',
          scheduledSendAt: null,
          sentAt: null,
          clickedAt: null,
          isVerifiedGoogleReview: false,
          createdAt: asOfDateIso
        };
        this.records.set(requestId, freqRecord);
        return freqRecord;
      }
    }

    // 5. Quiet hours check (9:00 PM to 8:00 AM)
    if (customerLocalHour >= 21 || customerLocalHour < 8) {
      const quietRecord: ReviewRequestRecord = {
        requestId,
        transactionId: trigger.transactionId,
        organizationId: trigger.organizationId,
        locationId: trigger.locationId,
        customerIdentifier: trigger.customerIdentifier,
        status: 'SUPPRESSED_QUIET_HOURS',
        scheduledSendAt: null,
        sentAt: null,
        clickedAt: null,
        isVerifiedGoogleReview: false,
        createdAt: asOfDateIso
      };
      this.records.set(requestId, quietRecord);
      return quietRecord;
    }

    // Mark transaction as processed
    this.processedTransactions.add(trigger.transactionId);

    // 6. Outbound adapter gating: disabled until business authorization and launch-market requirements are satisfied
    if (!this.isOutboundAdapterEnabled) {
      const adapterDisabledRecord: ReviewRequestRecord = {
        requestId,
        transactionId: trigger.transactionId,
        organizationId: trigger.organizationId,
        locationId: trigger.locationId,
        customerIdentifier: trigger.customerIdentifier,
        status: 'OUTBOUND_ADAPTER_DISABLED',
        scheduledSendAt: null,
        sentAt: null,
        clickedAt: null,
        isVerifiedGoogleReview: false,
        createdAt: asOfDateIso
      };
      this.records.set(requestId, adapterDisabledRecord);
      return adapterDisabledRecord;
    }

    // Successfully dispatched
    this.customerSentTimestamps.set(trigger.customerIdentifier, asOfTime);
    const sentRecord: ReviewRequestRecord = {
      requestId,
      transactionId: trigger.transactionId,
      organizationId: trigger.organizationId,
      locationId: trigger.locationId,
      customerIdentifier: trigger.customerIdentifier,
      status: 'SENT',
      scheduledSendAt: asOfDateIso,
      sentAt: asOfDateIso,
      clickedAt: null,
      isVerifiedGoogleReview: false, // Never falsely assumed to be verified Google review
      createdAt: asOfDateIso
    };

    this.records.set(requestId, sentRecord);
    return sentRecord;
  }

  /**
   * Tracks customer link click.
   * Acceptance requirement: clicks are NOT falsely attributed as verified customer-authored Google reviews.
   */
  static recordLinkClick(requestId: string, clickTimeIso = new Date().toISOString()): ReviewRequestRecord | null {
    const record = this.records.get(requestId);
    if (!record) return null;

    record.status = 'CLICKED';
    record.clickedAt = clickTimeIso;
    record.isVerifiedGoogleReview = false; // Preserved false: link click != published Google review!

    this.records.set(requestId, record);
    return record;
  }

  static getRecord(requestId: string): ReviewRequestRecord | undefined {
    return this.records.get(requestId);
  }
}
