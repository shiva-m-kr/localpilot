import { ReviewService } from '../packages/domain/src/reviewService.js';

console.log('--- Testing Prompt 066: Model Review Resources, Drafts and Restricted Retention ---');

ReviewService.reset();

// 1. Ingest initial review
const { resource, revisionChanged } = ReviewService.upsertReviewResource({
  organizationId: 'org_123',
  locationId: 'loc_downtown',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/123/locations/456/reviews/rev_999',
  reviewerName: 'Alice Smith',
  rating: 4,
  comment: 'Great plumbing service, fixed the leak fast.',
  fetchedAtIso: '2026-10-01T10:00:00Z'
});

console.log('✓ Review ingested:', resource.id, 'revision:', resource.sourceRevision);
if (revisionChanged) throw new Error('First ingest should not indicate revisionChanged=true');
if (!resource.expiresAt || !resource.expiresAt.startsWith('2026-10-31')) {
  throw new Error(`Expected expiresAt ~30 days later, got ${resource.expiresAt}`);
}

// 2. Record ephemeral assessment
const assessment = ReviewService.recordAssessment({
  reviewResourceId: resource.id,
  sentiment: 'positive',
  topics: ['plumbing', 'leak', 'speed'],
  riskFlags: [],
  language: 'en',
  confidence: 0.95
});

console.log('✓ Ephemeral assessment recorded:', assessment.sentiment, 'topics:', assessment.topics.join(', '));
if (assessment.expiresAt !== resource.expiresAt) {
  throw new Error('Assessment must inherit expiry timestamp from source review resource');
}

// 3. Create owner-authored reply draft
const draft = ReviewService.createReplyDraft({
  organizationId: 'org_123',
  locationId: 'loc_downtown',
  reviewResourceId: resource.id,
  draftText: 'Thank you for the review Alice! We take pride in quick and reliable plumbing repairs.',
  authorType: 'OWNER',
  authorUserId: 'usr_owner_1'
});

console.log('✓ Owner reply draft created:', draft.id, 'status:', draft.status);
if (draft.sourceRevisionHash !== resource.sourceRevision) {
  throw new Error('Draft must record the source review revision hash');
}

// 4. Test review edit: Reviewer changes rating from 4 to 2 stars and alters text
const updateResult = ReviewService.upsertReviewResource({
  organizationId: 'org_123',
  locationId: 'loc_downtown',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/123/locations/456/reviews/rev_999',
  reviewerName: 'Alice Smith',
  rating: 2,
  comment: 'Follow up: Leak started dripping again two days later.',
  fetchedAtIso: '2026-10-05T12:00:00Z'
});

console.log('✓ Review updated with changed rating/comment. revisionChanged:', updateResult.revisionChanged);
if (!updateResult.revisionChanged) {
  throw new Error('Expected revisionChanged to be true after comment and rating changed');
}

// Check that prior assessment was invalidated
const staleAssessment = ReviewService.getAssessmentForResource(resource.id);
if (staleAssessment) {
  throw new Error('Old assessment should have been deleted when source revision changed');
}
console.log('✓ Ephemeral assessment invalidated on source revision change');

// Check that unapproved draft was marked STALE
const staleDraft = ReviewService.getDraft(draft.id);
if (staleDraft?.status !== 'STALE') {
  throw new Error(`Expected draft status to be STALE, got ${staleDraft?.status}`);
}
console.log('✓ Draft marked STALE due to revision change');

// Attempting to approve stale draft must fail
let approvalBlocked = false;
try {
  ReviewService.approveReplyDraft({
    draftId: draft.id,
    approvedByUserId: 'usr_owner_1',
    consentScope: 'gbp:reviews:reply'
  });
} catch (e: any) {
  approvalBlocked = true;
  console.log('✓ Approval of stale draft blocked:', e.message);
}
if (!approvalBlocked) {
  throw new Error('Approval of stale draft should have failed');
}

// 5. Test 30-day retention purge
// Fast-forward time to 2026-11-15T00:00:00Z (past 30 days of 2026-10-05)
const purgeResult = ReviewService.purgeExpiredContent('2026-11-15T00:00:00Z');
console.log('✓ Purged expired content:', purgeResult);
if (purgeResult.purgedResources !== 1) {
  throw new Error(`Expected 1 purged resource, got ${purgeResult.purgedResources}`);
}

const purgedResource = ReviewService.getResource(resource.id);
if (purgedResource?.comment !== null) {
  throw new Error('External copyrighted review comment must be purged on retention expiry');
}
if (purgedResource.reviewerName !== '[PURGED_DUE_TO_RETENTION]') {
  throw new Error('Reviewer name must be scrubbed');
}

// Owner draft text is preserved as owner work product
const preservedDraft = ReviewService.getDraft(draft.id);
if (!preservedDraft || !preservedDraft.draftText) {
  throw new Error('Owner draft work product must be preserved independently of provider cache');
}
console.log('✓ Owner work product preserved while third-party content purged');

console.log('✓ All Prompt 066 tests passed successfully!');
