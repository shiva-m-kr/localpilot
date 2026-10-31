import { AutoReplyPolicyService } from '../packages/domain/src/autoReplyPolicyService.js';
import { ReviewClassificationService } from '../packages/domain/src/reviewClassificationService.js';
import { ReviewResource } from '@localpilot/contracts';

console.log('--- Testing Prompt 073: Narrowly Scoped Automatic-Reply Policies ---');

AutoReplyPolicyService.reset();

// 1. Enabling auto mode without provider requirements met must fail
let blockedNoProvider = false;
try {
  AutoReplyPolicyService.configurePolicy({
    organizationId: 'org_1',
    locationId: 'loc_1',
    provider: 'google_business_profile',
    mode: 'ELIGIBLE_POSITIVE_AUTO',
    ownerConsentUserId: 'usr_owner_1',
    providerRequirementsMet: false // OAuth disconnected
  });
} catch (e: any) {
  blockedNoProvider = true;
  console.log('✓ Auto mode blocked when provider requirements not met:', e.message);
}
if (!blockedNoProvider) throw new Error('Expected auto mode configuration to fail without provider requirements');

// 2. Enabling auto mode without explicit owner consent must fail
let blockedNoConsent = false;
try {
  AutoReplyPolicyService.configurePolicy({
    organizationId: 'org_1',
    locationId: 'loc_1',
    provider: 'google_business_profile',
    mode: 'ELIGIBLE_POSITIVE_AUTO',
    providerRequirementsMet: true
    // Missing ownerConsentUserId
  });
} catch (e: any) {
  blockedNoConsent = true;
  console.log('✓ Auto mode blocked without recorded owner consent:', e.message);
}
if (!blockedNoConsent) throw new Error('Expected auto mode configuration to fail without owner consent');

// 3. Configure valid ELIGIBLE_POSITIVE_AUTO policy
const policy = AutoReplyPolicyService.configurePolicy({
  organizationId: 'org_1',
  locationId: 'loc_1',
  provider: 'google_business_profile',
  mode: 'ELIGIBLE_POSITIVE_AUTO',
  ownerConsentUserId: 'usr_owner_1',
  providerRequirementsMet: true,
  languageAllowlist: ['en'],
  minDelayMinutes: 20,
  dailyCap: 2
});

console.log('✓ Policy configured successfully:', policy.mode, 'dailyCap:', policy.dailyCap);

// 4. Test Acceptance: RATING ALONE NEVER AUTHORIZES PUBLICATION
const ratingOnlyReview: ReviewResource = {
  id: 'rev_rating_only',
  organizationId: 'org_1',
  locationId: 'loc_1',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/rate_only',
  reviewerName: 'Silent Sam',
  rating: 5,
  comment: null, // Rating only!
  sourceRevision: 'hash_rate_only',
  fetchedAt: '2026-10-18T10:00:00Z',
  expiresAt: '2026-11-17T10:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const classifRatingOnly = ReviewClassificationService.classifyReview({
  rating: 5,
  reviewerName: 'Silent Sam',
  comment: null
});

const evalRatingOnly = AutoReplyPolicyService.evaluateReviewForAutoReply({
  policy,
  review: ratingOnlyReview,
  classification: classifRatingOnly
});

console.log('✓ Rating-only evaluation: isEligible =', evalRatingOnly.isEligibleForAutoPublish, 'Reason:', evalRatingOnly.reason);
if (evalRatingOnly.isEligibleForAutoPublish) {
  throw new Error('Violation of acceptance criteria: Rating alone authorized publication!');
}

// 5. Test Acceptance: Sarcastic 5-star complaint MUST require review
const sarcasticReview: ReviewResource = {
  id: 'rev_sarcastic',
  organizationId: 'org_1',
  locationId: 'loc_1',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/sarcastic',
  reviewerName: 'Sarcastic Steve',
  rating: 5,
  comment: 'Best plumber if you love sewage flooding your kitchen! 5 stars for a disaster.',
  sourceRevision: 'hash_sarcastic',
  fetchedAt: '2026-10-18T10:05:00Z',
  expiresAt: '2026-11-17T10:05:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const classifSarcastic = ReviewClassificationService.classifyReview({
  rating: 5,
  reviewerName: 'Sarcastic Steve',
  comment: sarcasticReview.comment
});

const evalSarcastic = AutoReplyPolicyService.evaluateReviewForAutoReply({
  policy,
  review: sarcasticReview,
  classification: classifSarcastic
});

console.log('✓ Sarcastic review evaluation: isEligible =', evalSarcastic.isEligibleForAutoPublish);
if (evalSarcastic.isEligibleForAutoPublish) {
  throw new Error('Sarcastic 5-star complaint was erroneously approved for auto-reply!');
}

// 6. Test Valid Positive Review -> Eligible with Delay
const genuinePositiveReview: ReviewResource = {
  id: 'rev_genuine',
  organizationId: 'org_1',
  locationId: 'loc_1',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/genuine',
  reviewerName: 'Happy Harry',
  rating: 5,
  comment: 'Punctual, friendly technician who fixed our water heater without mess.',
  sourceRevision: 'hash_genuine',
  fetchedAt: '2026-10-18T10:10:00Z',
  expiresAt: '2026-11-17T10:10:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const classifPositive = ReviewClassificationService.classifyReview({
  rating: 5,
  reviewerName: 'Happy Harry',
  comment: genuinePositiveReview.comment
});

const evalPositive = AutoReplyPolicyService.evaluateReviewForAutoReply({
  policy,
  review: genuinePositiveReview,
  classification: classifPositive,
  asOfDateIso: '2026-10-18T10:10:00Z'
});

console.log('✓ Genuine positive review: isEligible =', evalPositive.isEligibleForAutoPublish, 'Scheduled at:', evalPositive.scheduledPublishAt);
if (!evalPositive.isEligibleForAutoPublish) {
  throw new Error('Genuine positive uncomplicated review should be eligible for auto-reply');
}
if (!evalPositive.scheduledPublishAt || !evalPositive.scheduledPublishAt.includes('10:30:00')) {
  throw new Error(`Expected 20-minute delay buffer, got ${evalPositive.scheduledPublishAt}`);
}

// 7. Test Revoking Consent
const revokedPolicy = AutoReplyPolicyService.revokeConsent('org_1', 'loc_1');
console.log('✓ Policy consent revoked. New mode:', revokedPolicy.mode);
if (revokedPolicy.mode !== 'DRAFT_ONLY' || !revokedPolicy.isConsentRevoked) {
  throw new Error('Revoking consent must immediately downgrade mode to DRAFT_ONLY');
}

console.log('✓ All Prompt 073 tests passed successfully!');
