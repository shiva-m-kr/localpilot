import { ReviewSyncService } from '../packages/domain/src/reviewSyncService.js';
import { ReviewService } from '../packages/domain/src/reviewService.js';

console.log('--- Testing Prompt 067: Bounded Authorized Review Synchronization ---');

ReviewService.reset();
ReviewSyncService.reset();

// 1. Process first page with nextPageToken (Partial sync slice)
const syncSlice1 = ReviewSyncService.processSyncSlice({
  organizationId: 'org_auto',
  locationId: 'loc_shop_1',
  provider: 'google_business_profile',
  pages: [
    {
      pageToken: 'page_1',
      nextPageToken: 'page_2',
      reviews: [
        {
          externalResourceId: 'accounts/1/locations/1/reviews/rev_101',
          reviewerName: 'Bob Builder',
          rating: 5,
          comment: 'Fixed my pipes promptly and cleanly.',
          existingReply: null,
          createTime: '2026-10-01T12:00:00Z',
          updateTime: '2026-10-01T12:00:00Z'
        },
        {
          externalResourceId: 'accounts/1/locations/1/reviews/rev_102',
          reviewerName: 'Carol Danvers',
          rating: 3,
          comment: 'Good work but arrived 30 mins late.',
          existingReply: {
            comment: 'Thanks Carol, we apologize for the slight delay during morning traffic!',
            updateTime: '2026-10-02T09:00:00Z'
          },
          createTime: '2026-10-02T08:00:00Z',
          updateTime: '2026-10-02T09:00:00Z'
        }
      ],
      totalInAccount: 45
    }
  ]
});

console.log('✓ Slice 1 processed. Synced count:', syncSlice1.upsertedCount);
if (syncSlice1.isLifetimeHistoryComplete) {
  throw new Error('Sync slice with nextPageToken must NOT be marked isLifetimeHistoryComplete');
}
if (syncSlice1.existingRepliesProtected !== 1) {
  throw new Error(`Expected 1 existing reply protected, got ${syncSlice1.existingRepliesProtected}`);
}
console.log('✓ Verified: Partial page did not claim lifetime history completeness; existing reply protected.');

// 2. Duplicate page delivery must not create duplicate work
const duplicatePageSync = ReviewSyncService.processSyncSlice({
  organizationId: 'org_auto',
  locationId: 'loc_shop_1',
  provider: 'google_business_profile',
  pages: [
    {
      pageToken: 'page_1',
      nextPageToken: 'page_2',
      reviews: [
        {
          externalResourceId: 'accounts/1/locations/1/reviews/rev_101',
          reviewerName: 'Bob Builder',
          rating: 5,
          comment: 'Fixed my pipes promptly and cleanly.',
          existingReply: null,
          createTime: '2026-10-01T12:00:00Z',
          updateTime: '2026-10-01T12:00:00Z'
        }
      ]
    }
  ]
});

if (duplicatePageSync.upsertedCount !== 0) {
  throw new Error(`Expected duplicate page to be skipped (0 upserted), got ${duplicatePageSync.upsertedCount}`);
}
console.log('✓ Duplicate page correctly skipped without duplicate work');

// 3. Process final page without nextPageToken -> Lifetime history becomes complete
const syncSlice2 = ReviewSyncService.processSyncSlice({
  organizationId: 'org_auto',
  locationId: 'loc_shop_1',
  provider: 'google_business_profile',
  pages: [
    {
      pageToken: 'page_2',
      nextPageToken: undefined, // End of pagination
      reviews: [
        {
          externalResourceId: 'accounts/1/locations/1/reviews/rev_103',
          reviewerName: 'Dave Miller',
          rating: 5,
          comment: 'Exceptional service!',
          existingReply: null,
          createTime: '2026-10-03T10:00:00Z',
          updateTime: '2026-10-03T10:00:00Z'
        }
      ]
    }
  ]
});

if (!syncSlice2.isLifetimeHistoryComplete) {
  throw new Error('Full pagination completion should set isLifetimeHistoryComplete: true');
}
console.log('✓ Terminal page reached: isLifetimeHistoryComplete set to true');

// 4. Test sampling API (where API only returns a sampled subset)
const samplingSync = ReviewSyncService.processSyncSlice({
  organizationId: 'org_auto',
  locationId: 'loc_shop_2',
  provider: 'google_business_profile',
  isSamplingApi: true,
  pages: [
    {
      pageToken: 'sample_page',
      nextPageToken: undefined,
      reviews: [
        {
          externalResourceId: 'accounts/1/locations/2/reviews/rev_sample',
          reviewerName: 'Eve Brown',
          rating: 4,
          comment: 'Sampled review.',
          existingReply: null,
          createTime: '2026-10-04T10:00:00Z',
          updateTime: '2026-10-04T10:00:00Z'
        }
      ]
    }
  ]
});

if (samplingSync.isLifetimeHistoryComplete) {
  throw new Error('Sampling API must NEVER be marked isLifetimeHistoryComplete');
}
console.log('✓ Sampling API correctly prevented false lifetime completeness');

// 5. Test removal handling
const removedHandled = ReviewSyncService.handleRemovedReview({
  organizationId: 'org_auto',
  locationId: 'loc_shop_1',
  externalResourceId: 'accounts/1/locations/1/reviews/rev_101'
});

if (!removedHandled) {
  throw new Error('Failed to handle removed review resource');
}
console.log('✓ Removed review handled and marked purged/deleted');

console.log('✓ All Prompt 067 tests passed successfully!');
