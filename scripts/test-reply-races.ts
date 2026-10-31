import { ReviewRaceHandlingService } from '../packages/domain/src/reviewRaceHandlingService.js';
import { ReviewResource } from '@localpilot/contracts';

console.log('--- Testing Prompt 075: Handle Review Edits, Races, Removals and Disconnects ---');

ReviewRaceHandlingService.reset();

const mockReview: ReviewResource = {
  id: 'rev_race_01',
  organizationId: 'org_race',
  locationId: 'loc_race',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/rev_race_01',
  reviewerName: 'Timothy Ray',
  rating: 4,
  comment: 'Fast repair, clean truck.',
  sourceRevision: 'initial_revision_sha256',
  fetchedAt: '2026-10-20T10:00:00Z',
  expiresAt: '2026-11-19T10:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

// 1. Worker race condition test: Worker 1 acquires lease
const worker1Lease = ReviewRaceHandlingService.acquireLease({
  reviewResourceId: mockReview.id,
  workerId: 'worker_node_alpha',
  ttlSeconds: 30,
  nowIso: '2026-10-20T10:00:00Z'
});

console.log('✓ Worker 1 acquired lease:', worker1Lease.success, 'Lease ID:', worker1Lease.lease?.leaseId);
if (!worker1Lease.success) throw new Error('Worker 1 failed to acquire lease');

// Worker 2 attempts concurrent acquire on same review resource -> MUST FAIL
const worker2Lease = ReviewRaceHandlingService.acquireLease({
  reviewResourceId: mockReview.id,
  workerId: 'worker_node_beta',
  ttlSeconds: 30,
  nowIso: '2026-10-20T10:00:05Z'
});

console.log('✓ Worker 2 concurrent acquisition result:', worker2Lease.success, 'Diagnostic:', worker2Lease.errorDiagnostic?.conditionType);
if (worker2Lease.success) {
  throw new Error('Worker 2 was able to acquire conflicting lease! Concurrency race allowed.');
}
if (worker2Lease.errorDiagnostic?.conditionType !== 'WORKER_LEASE_ACQUISITION_FAILED') {
  throw new Error('Expected WORKER_LEASE_ACQUISITION_FAILED diagnostic');
}

// 2. Race: Customer edited review during wait buffer (stale source)
const modifiedReview: ReviewResource = {
  ...mockReview,
  sourceRevision: 'updated_revision_sha256_by_customer',
  comment: 'Fast repair, but later found a small leak.'
};

const diagSourceModified = ReviewRaceHandlingService.verifyInflightPreconditions({
  initialReadTimestampIso: '2026-10-20T10:00:00Z',
  expectedSourceRevision: mockReview.sourceRevision,
  currentLiveReview: modifiedReview,
  isConsentRevoked: false,
  isTokenValid: true
});

console.log('✓ Customer edit during wait diagnostic:', diagSourceModified.conditionType);
if (diagSourceModified.conditionType !== 'STALE_SOURCE_MODIFIED_DURING_WAIT') {
  throw new Error(`Expected STALE_SOURCE_MODIFIED_DURING_WAIT, got ${diagSourceModified.conditionType}`);
}
if (diagSourceModified.recoveryAction !== 'PAUSE_JOB') {
  throw new Error('Expected PAUSE_JOB recovery action on stale source modification');
}

// 3. Race: Manual reply added directly on Google during wait buffer
const manualReplyReview: ReviewResource = {
  ...mockReview,
  existingReply: {
    comment: 'Thanks Timothy! Owner replied manually from phone.',
    updateTime: '2026-10-20T10:00:10Z'
  }
};

const diagManualReply = ReviewRaceHandlingService.verifyInflightPreconditions({
  initialReadTimestampIso: '2026-10-20T10:00:00Z',
  expectedSourceRevision: mockReview.sourceRevision,
  currentLiveReview: manualReplyReview,
  isConsentRevoked: false,
  isTokenValid: true
});

console.log('✓ Manual provider reply during wait diagnostic:', diagManualReply.conditionType);
if (diagManualReply.conditionType !== 'MANUAL_PROVIDER_REPLY_DETECTED') {
  throw new Error(`Expected MANUAL_PROVIDER_REPLY_DETECTED, got ${diagManualReply.conditionType}`);
}
if (diagManualReply.recoveryAction !== 'ABORT_INFLIGHT') {
  throw new Error('Expected ABORT_INFLIGHT when manual reply exists');
}

// 4. Race: Review removed / deleted by customer or Google during wait
const diagRemoved = ReviewRaceHandlingService.verifyInflightPreconditions({
  initialReadTimestampIso: '2026-10-20T10:00:00Z',
  expectedSourceRevision: mockReview.sourceRevision,
  currentLiveReview: null, // Review deleted on Google!
  isConsentRevoked: false,
  isTokenValid: true
});

console.log('✓ Removed resource diagnostic:', diagRemoved.conditionType);
if (diagRemoved.conditionType !== 'RESOURCE_REMOVED_OR_DELETED') {
  throw new Error(`Expected RESOURCE_REMOVED_OR_DELETED, got ${diagRemoved.conditionType}`);
}

// 5. Race: Owner revoked consent inflight
const diagConsentRevoked = ReviewRaceHandlingService.verifyInflightPreconditions({
  initialReadTimestampIso: '2026-10-20T10:00:00Z',
  expectedSourceRevision: mockReview.sourceRevision,
  currentLiveReview: mockReview,
  isConsentRevoked: true, // Consent revoked!
  isTokenValid: true
});

console.log('✓ Inflight consent revoked diagnostic:', diagConsentRevoked.conditionType);
if (diagConsentRevoked.conditionType !== 'CONSENT_REVOKED_INFLIGHT') {
  throw new Error(`Expected CONSENT_REVOKED_INFLIGHT, got ${diagConsentRevoked.conditionType}`);
}

// 6. Race: Token lost / expired inflight
const diagTokenLost = ReviewRaceHandlingService.verifyInflightPreconditions({
  initialReadTimestampIso: '2026-10-20T10:00:00Z',
  expectedSourceRevision: mockReview.sourceRevision,
  currentLiveReview: mockReview,
  isConsentRevoked: false,
  isTokenValid: false // OAuth disconnected!
});

console.log('✓ Token loss diagnostic:', diagTokenLost.conditionType);
if (diagTokenLost.conditionType !== 'INTEGRATION_TOKEN_LOST') {
  throw new Error(`Expected INTEGRATION_TOKEN_LOST, got ${diagTokenLost.conditionType}`);
}

console.log('✓ All Prompt 075 tests passed successfully!');
