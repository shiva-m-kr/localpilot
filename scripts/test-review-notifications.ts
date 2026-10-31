import { ReviewNotificationService } from '../packages/domain/src/reviewNotificationService.js';
import { ReviewService } from '../packages/domain/src/reviewService.js';
import { GooglePubSubNotificationPayload } from '../packages/contracts/src/reviewNotifications.js';

console.log('--- Testing Prompt 068: Review Notifications and Reconciliation ---');

ReviewService.reset();
ReviewNotificationService.reset();

// 1. Register authorized location binding
ReviewNotificationService.registerLocationBinding({
  organizationId: 'org_main',
  locationId: 'loc_store_1',
  googleLocationName: 'accounts/123/locations/456'
});

// Mock live review fetcher to prove we fetch authorized live review rather than trusting push payload
const mockLiveFetcher = (resourceName: string) => {
  if (resourceName === 'accounts/123/locations/456/reviews/rev_fresh_001') {
    return {
      externalResourceId: resourceName,
      reviewerName: 'Verified Reviewer',
      rating: 5,
      comment: 'Authentic text fetched directly from Google API, not untrusted push body.',
      existingReply: null,
      createTime: '2026-10-10T12:00:00Z',
      updateTime: '2026-10-10T12:00:00Z'
    };
  }
  return null;
};

// 2. Foreign account notification rejection
const foreignPayload: GooglePubSubNotificationPayload = {
  subscription: 'projects/lp/subscriptions/gbp-reviews',
  message: {
    messageId: 'msg_foreign_999',
    publishTime: '2026-10-10T12:05:00Z',
    data: Buffer.from(
      JSON.stringify({
        resourceName: 'accounts/999/locations/999/reviews/rev_rogue',
        eventType: 'NEW_REVIEW'
      })
    ).toString('base64')
  }
};

const foreignResult = ReviewNotificationService.handlePubSubNotification(
  foreignPayload,
  mockLiveFetcher,
  '2026-10-10T12:05:02Z'
);

console.log('✓ Foreign account handling status:', foreignResult.reconciliationStatus);
if (foreignResult.reconciliationStatus !== 'REJECTED_FOREIGN_ACCOUNT') {
  throw new Error(`Expected REJECTED_FOREIGN_ACCOUNT, got ${foreignResult.reconciliationStatus}`);
}

// 3. Valid authorized notification with visible delivery latency
const validPayload: GooglePubSubNotificationPayload = {
  subscription: 'projects/lp/subscriptions/gbp-reviews',
  message: {
    messageId: 'msg_authorized_100',
    publishTime: '2026-10-10T12:00:00Z',
    data: Buffer.from(
      JSON.stringify({
        resourceName: 'accounts/123/locations/456/reviews/rev_fresh_001',
        eventType: 'NEW_REVIEW'
      })
    ).toString('base64')
  }
};

const validResult = ReviewNotificationService.handlePubSubNotification(
  validPayload,
  mockLiveFetcher,
  '2026-10-10T12:00:04.500Z' // 4500ms latency
);

console.log('✓ Valid notification refreshed. Latency:', validResult.deliveryLatencyMs, 'ms');
if (validResult.reconciliationStatus !== 'REFRESHED') {
  throw new Error(`Expected REFRESHED, got ${validResult.reconciliationStatus}`);
}
if (validResult.deliveryLatencyMs !== 4500) {
  throw new Error(`Expected 4500ms latency, got ${validResult.deliveryLatencyMs}`);
}

// Check that review was cached from live fetcher
const cachedReview = Array.from((ReviewService as any).reviewResources.values()).find(
  (r: any) => r.externalResourceId === 'accounts/123/locations/456/reviews/rev_fresh_001'
);
if (!cachedReview || !cachedReview.comment?.includes('Authentic text fetched directly')) {
  throw new Error('Review was not refreshed from authorized live fetcher');
}
console.log('✓ Verified: live review refreshed instead of trusting push payload text');

// 4. Duplicate message handling
const duplicateResult = ReviewNotificationService.handlePubSubNotification(
  validPayload,
  mockLiveFetcher,
  '2026-10-10T12:00:06Z'
);

console.log('✓ Duplicate message status:', duplicateResult.reconciliationStatus);
if (duplicateResult.reconciliationStatus !== 'SKIPPED_DUPLICATE') {
  throw new Error(`Expected SKIPPED_DUPLICATE, got ${duplicateResult.reconciliationStatus}`);
}

// 5. Bounded polling reconciliation for missed / out-of-order events
const pollResult = ReviewNotificationService.runPollingReconciliation({
  organizationId: 'org_main',
  locationId: 'loc_store_1',
  recentlyUpdatedReviews: [
    {
      externalResourceId: 'accounts/123/locations/456/reviews/rev_missed_002',
      reviewerName: 'Missed Reviewer',
      rating: 4,
      comment: 'Review that missed pubsub notification delivery.',
      existingReply: null,
      createTime: '2026-10-10T12:10:00Z',
      updateTime: '2026-10-10T12:10:00Z'
    }
  ]
});

console.log('✓ Polling reconciliation reconciled missed reviews:', pollResult.reconciledCount);
if (pollResult.reconciledCount !== 1) {
  throw new Error('Polling reconciliation failed to catch missed review');
}

console.log('✓ All Prompt 068 tests passed successfully!');
