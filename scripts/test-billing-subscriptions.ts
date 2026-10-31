import assert from 'node:assert/strict';
import {
  BillingSubscriptionService,
  BillingStorage,
  SubscriptionRecord,
  BillingWebhookEvent,
} from '@localpilot/domain';

async function runBillingSubscriptionTests() {
  console.log('--- Testing Subscriptions and Billing Webhooks (Prompt 094) ---');

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const locationId = '00000000-0000-0000-0000-000000000002';
  const providerSubId = 'sub_rzp_123456789';

  let currentSubscription: SubscriptionRecord = {
    id: 'sub-rec-1',
    tenantId: tenantId as any,
    locationId: locationId as any,
    planTier: 'PRO_BUSINESS',
    status: 'ACTIVE',
    providerSubscriptionId: providerSubId,
    providerCustomerId: 'cust_rzp_999',
    currency: 'INR',
    monthlyAmountMinor: 599900,
    currentPeriodStart: '2026-10-01T00:00:00Z',
    currentPeriodEnd: '2026-10-31T23:59:59Z',
    cancelAtPeriodEnd: false,
    isProductionAccount: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const processedEvents = new Set<string>();
  let paidJobsPaused = false;

  const mockStorage: BillingStorage = {
    async getSubscriptionByProviderId(subId: string) {
      return subId === providerSubId ? { ...currentSubscription } : null;
    },
    async saveSubscription(sub: SubscriptionRecord) {
      currentSubscription = { ...sub };
    },
    async isWebhookEventProcessed(eventId: string) {
      return processedEvents.has(eventId);
    },
    async markWebhookEventProcessed(eventId: string, _eventType: string) {
      processedEvents.add(eventId);
    },
    async pausePaidJobsForLocation(locId: string) {
      if (locId === locationId) paidJobsPaused = true;
    },
  };

  const webhookSecret = 'rzp_sec_mock_key_999';
  const service = new BillingSubscriptionService(mockStorage, webhookSecret);

  // Test 1: Invalid Signature Rejection
  console.log('Test 1: Invalid signature returns SIGNATURE_INVALID');
  const fakeEvent: BillingWebhookEvent = {
    eventId: 'evt_fake_1',
    eventType: 'subscription.charged',
    provider: 'RAZORPAY',
    signature: 'invalid_forged_signature',
    timestamp: Math.floor(Date.now() / 1000),
    payload: { subscriptionId: providerSubId },
  };

  const invalidResult = await service.handleWebhook(fakeEvent, JSON.stringify(fakeEvent.payload));
  assert.equal(invalidResult.status, 'SIGNATURE_INVALID');

  // Test 2: Valid Signed Webhook - Charged event
  console.log('Test 2: Valid signed webhook updates subscription period');
  const payloadCharged = { subscriptionId: providerSubId, currentPeriodEnd: 1795000000 };
  const payloadChargedString = JSON.stringify(payloadCharged);
  const validSignature = service.generateWebhookSignature(payloadChargedString);

  const chargedEvent: BillingWebhookEvent = {
    eventId: 'evt_valid_charged_1',
    eventType: 'subscription.charged',
    provider: 'RAZORPAY',
    signature: validSignature,
    timestamp: Math.floor(Date.now() / 1000),
    payload: payloadCharged,
  };

  const chargedResult = await service.handleWebhook(chargedEvent, payloadChargedString);
  assert.equal(chargedResult.status, 'PROCESSED');
  assert.equal(chargedResult.newSubscriptionStatus, 'ACTIVE');

  // Test 3: Idempotent Deduplication (identical event ignored)
  console.log('Test 3: Idempotent duplicate event ignored without error');
  const duplicateResult = await service.handleWebhook(chargedEvent, payloadChargedString);
  assert.equal(duplicateResult.status, 'DUPLICATE_IGNORED');

  // Test 4: Subscription Cancellation pauses future paid automation jobs
  console.log('Test 4: Subscription Cancellation pauses paid jobs');
  const payloadCancel = { subscriptionId: providerSubId };
  const payloadCancelString = JSON.stringify(payloadCancel);
  const cancelSignature = service.generateWebhookSignature(payloadCancelString);

  const cancelEvent: BillingWebhookEvent = {
    eventId: 'evt_cancel_1',
    eventType: 'subscription.cancelled',
    provider: 'RAZORPAY',
    signature: cancelSignature,
    timestamp: Math.floor(Date.now() / 1000) + 10,
    payload: payloadCancel,
  };

  const cancelResult = await service.handleWebhook(cancelEvent, payloadCancelString);
  assert.equal(cancelResult.status, 'PROCESSED');
  assert.equal(cancelResult.newSubscriptionStatus, 'CANCELED');
  assert.equal(currentSubscription.status, 'CANCELED');
  assert.equal(paidJobsPaused, true, 'Paid automation jobs must be paused upon subscription cancellation');

  console.log('Prompt 094 verified successfully!\n');
}

runBillingSubscriptionTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
