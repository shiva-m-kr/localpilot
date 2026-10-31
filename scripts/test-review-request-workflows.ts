import { ReviewRequestWorkflowService } from '../packages/domain/src/reviewRequestWorkflowService.js';
import { ReviewRequestTrigger } from '@localpilot/contracts';

console.log('--- Testing Prompt 078: Permission-Aware Review Request Workflows ---');

ReviewRequestWorkflowService.reset();

// 1. Acceptance test: Outbound adapter disabled by default
const triggerValid: ReviewRequestTrigger = {
  transactionId: 'tx_order_1001',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_abc',
  completedAt: '2026-10-21T12:00:00Z',
  hasContactConsent: true,
  isOptedOut: false,
  customerSentimentHint: 'satisfied'
};

const resultDisabled = ReviewRequestWorkflowService.processTransactionTrigger(triggerValid);
console.log('✓ Initial dispatch with disabled adapter status:', resultDisabled.status);
if (resultDisabled.status !== 'OUTBOUND_ADAPTER_DISABLED') {
  throw new Error(`Expected OUTBOUND_ADAPTER_DISABLED, got ${resultDisabled.status}`);
}

// Enable outbound adapter after simulated authorization
ReviewRequestWorkflowService.isOutboundAdapterEnabled = true;

// 2. Acceptance test: Objective eligibility does NOT selectively remove unhappy customers
const triggerUnhappy: ReviewRequestTrigger = {
  transactionId: 'tx_order_1002',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_def',
  completedAt: '2026-10-21T13:00:00Z',
  hasContactConsent: true,
  isOptedOut: false,
  customerSentimentHint: 'dissatisfied' // Customer was unhappy, but has valid transaction & consent
};

const resultUnhappy = ReviewRequestWorkflowService.processTransactionTrigger(triggerUnhappy);
console.log('✓ Unhappy customer with consent status:', resultUnhappy.status);
if (resultUnhappy.status !== 'SENT') {
  throw new Error('Violation of anti-gating: Unhappy customer was selectively blocked or filtered!');
}

// 3. Acceptance test: Repeated transaction event sends at most 1 invitation (Deduplication)
const resultDuplicate = ReviewRequestWorkflowService.processTransactionTrigger(triggerUnhappy);
console.log('✓ Duplicate transaction event status:', resultDuplicate.status);
if (resultDuplicate.status !== 'DUPLICATE_TRANSACTION_IGNORED') {
  throw new Error(`Expected DUPLICATE_TRANSACTION_IGNORED, got ${resultDuplicate.status}`);
}

// 4. Acceptance test: Consent & Opt-out enforcement
const triggerNoConsent: ReviewRequestTrigger = {
  transactionId: 'tx_order_1003',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_noconsent',
  completedAt: '2026-10-21T14:00:00Z',
  hasContactConsent: false, // No consent
  isOptedOut: false
};
const resultNoConsent = ReviewRequestWorkflowService.processTransactionTrigger(triggerNoConsent);
console.log('✓ No consent trigger status:', resultNoConsent.status);
if (resultNoConsent.status !== 'SUPPRESSED_NO_CONSENT') {
  throw new Error(`Expected SUPPRESSED_NO_CONSENT, got ${resultNoConsent.status}`);
}

const triggerOptOut: ReviewRequestTrigger = {
  transactionId: 'tx_order_1004',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_optout',
  completedAt: '2026-10-21T14:00:00Z',
  hasContactConsent: true,
  isOptedOut: true // Opted out
};
const resultOptOut = ReviewRequestWorkflowService.processTransactionTrigger(triggerOptOut);
console.log('✓ Opted-out trigger status:', resultOptOut.status);
if (resultOptOut.status !== 'SUPPRESSED_OPTED_OUT') {
  throw new Error(`Expected SUPPRESSED_OPTED_OUT, got ${resultOptOut.status}`);
}

// 5. Acceptance test: Quiet hours protection (e.g. 11 PM / 23:00)
const triggerQuietHours: ReviewRequestTrigger = {
  transactionId: 'tx_order_1005',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_quiet',
  completedAt: '2026-10-21T23:00:00Z',
  hasContactConsent: true,
  isOptedOut: false
};
const resultQuiet = ReviewRequestWorkflowService.processTransactionTrigger(triggerQuietHours, '2026-10-21T23:00:00Z', 23);
console.log('✓ Quiet hours trigger status:', resultQuiet.status);
if (resultQuiet.status !== 'SUPPRESSED_QUIET_HOURS') {
  throw new Error(`Expected SUPPRESSED_QUIET_HOURS, got ${resultQuiet.status}`);
}

// 6. Acceptance test: Frequency cap (90 days)
const triggerFreq1: ReviewRequestTrigger = {
  transactionId: 'tx_order_1006_A',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_repeat_buyer',
  completedAt: '2026-10-21T15:00:00Z',
  hasContactConsent: true,
  isOptedOut: false
};
const resultFreq1 = ReviewRequestWorkflowService.processTransactionTrigger(triggerFreq1, '2026-10-21T15:00:00Z', 15);
if (resultFreq1.status !== 'SENT') throw new Error('First send failed');

// Repeat visit 10 days later -> must be suppressed under 90-day cap
const triggerFreq2: ReviewRequestTrigger = {
  transactionId: 'tx_order_1006_B',
  organizationId: 'org_work',
  locationId: 'loc_work',
  customerIdentifier: 'cust_hash_repeat_buyer',
  completedAt: '2026-10-31T15:00:00Z',
  hasContactConsent: true,
  isOptedOut: false
};
const resultFreq2 = ReviewRequestWorkflowService.processTransactionTrigger(triggerFreq2, '2026-10-31T15:00:00Z', 15);
console.log('✓ 10-day repeat visit frequency status:', resultFreq2.status);
if (resultFreq2.status !== 'SUPPRESSED_FREQUENCY_CAP') {
  throw new Error(`Expected SUPPRESSED_FREQUENCY_CAP, got ${resultFreq2.status}`);
}

// 7. Acceptance test: Clicks are NOT falsely attributed as verified customer-authored Google reviews
const clickedRecord = ReviewRequestWorkflowService.recordLinkClick(resultUnhappy.requestId);
console.log('✓ Recorded link click status:', clickedRecord?.status, 'isVerifiedGoogleReview:', clickedRecord?.isVerifiedGoogleReview);
if (clickedRecord?.status !== 'CLICKED') {
  throw new Error('Expected status CLICKED');
}
if (clickedRecord?.isVerifiedGoogleReview === true) {
  throw new Error('Violation of acceptance criteria: Link click was falsely attributed as a verified Google review!');
}

console.log('✓ All Prompt 078 tests passed successfully!');
