import crypto from 'node:crypto';
import {
  SubscriptionRecord,
  BillingWebhookEvent,
  WebhookProcessingResult,
  SubscriptionStatus,
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface BillingStorage {
  getSubscriptionByProviderId(providerSubId: string): Promise<SubscriptionRecord | null>;
  saveSubscription(sub: SubscriptionRecord): Promise<void>;
  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  markWebhookEventProcessed(eventId: string, eventType: string): Promise<void>;
  pausePaidJobsForLocation(locationId: string): Promise<void>;
}

export class BillingSubscriptionService {
  private storage: BillingStorage;
  private webhookSecret: string;

  constructor(storage: BillingStorage, webhookSecret: string = 'test_webhook_secret_key_12345') {
    this.storage = storage;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Computes HMAC SHA256 signature for webhook validation
   */
  public generateWebhookSignature(payloadString: string): string {
    return crypto.createHmac('sha256', this.webhookSecret).update(payloadString).digest('hex');
  }

  /**
   * Processes incoming billing webhooks idempotently with signature verification
   */
  public async handleWebhook(
    event: BillingWebhookEvent,
    rawPayloadBody: string
  ): Promise<WebhookProcessingResult> {
    // 1. Signature Verification
    const expectedSignature = this.generateWebhookSignature(rawPayloadBody);
    if (event.signature !== expectedSignature) {
      return {
        eventId: event.eventId,
        status: 'SIGNATURE_INVALID',
        message: 'Webhook signature verification failed. Request rejected.',
      };
    }

    // 2. Idempotency Check: prevent duplicate execution
    const isProcessed = await this.storage.isWebhookEventProcessed(event.eventId);
    if (isProcessed) {
      return {
        eventId: event.eventId,
        status: 'DUPLICATE_IGNORED',
        message: `Webhook event '${event.eventId}' was already processed.`,
      };
    }

    // 3. Find target subscription
    const providerSubId = event.payload.subscriptionId || event.payload.id;
    if (!providerSubId) {
      throw new ValidationFailedError('Webhook payload missing subscriptionId.');
    }

    const subscription = await this.storage.getSubscriptionByProviderId(providerSubId);
    if (!subscription) {
      throw new ValidationFailedError(`Subscription '${providerSubId}' not found.`);
    }

    // 4. Out-of-order check
    const eventTimeMs = event.timestamp * 1000;
    const subUpdatedMs = new Date(subscription.updatedAt).getTime();
    if (eventTimeMs < subUpdatedMs && event.eventType !== 'subscription.charged') {
      return {
        eventId: event.eventId,
        status: 'OUT_OF_ORDER_IGNORED',
        message: `Out-of-order event: Event timestamp (${eventTimeMs}) is older than subscription update (${subUpdatedMs}).`,
      };
    }

    // 5. State transitions
    let newStatus: SubscriptionStatus = subscription.status;
    const nowIso = new Date().toISOString();

    switch (event.eventType) {
      case 'subscription.activated':
        newStatus = 'ACTIVE';
        subscription.cancelAtPeriodEnd = false;
        break;

      case 'subscription.charged':
        newStatus = 'ACTIVE';
        if (event.payload.currentPeriodEnd) {
          subscription.currentPeriodEnd = new Date(event.payload.currentPeriodEnd * 1000).toISOString();
        }
        break;

      case 'subscription.payment_failed':
        newStatus = 'PAST_DUE';
        break;

      case 'subscription.cancelled':
        newStatus = 'CANCELED';
        subscription.cancelAtPeriodEnd = true;
        subscription.canceledAt = nowIso;
        // Pause future paid automation jobs while honoring hosting until period end
        await this.storage.pausePaidJobsForLocation(subscription.locationId);
        break;
    }

    subscription.status = newStatus;
    subscription.updatedAt = nowIso;

    await this.storage.saveSubscription(subscription);
    await this.storage.markWebhookEventProcessed(event.eventId, event.eventType);

    return {
      eventId: event.eventId,
      status: 'PROCESSED',
      message: `Successfully processed ${event.eventType}.`,
      newSubscriptionStatus: newStatus,
    };
  }
}
