import { ReplyDraftGenerationService } from '../packages/domain/src/replyDraftGenerationService.js';
import { ReviewClassificationService } from '../packages/domain/src/reviewClassificationService.js';
import { ReviewResource, ReplyGenerationOptions } from '@localpilot/contracts';

console.log('--- Testing Prompt 071: Generate Grounded, Natural Review Reply Drafts ---');

ReplyDraftGenerationService.reset();

const mockOptions: ReplyGenerationOptions = {
  brandVoice: 'professional_warm',
  confirmedBusinessName: 'Apex Plumbing Experts',
  confirmedPhone: '555-0199',
  confirmedPublicEmail: 'help@apexplumbing.com',
  locationName: 'Downtown Seattle'
};

// 1. Positive review draft generation
const positiveReview: ReviewResource = {
  id: 'rev_pos_1',
  organizationId: 'org_1',
  locationId: 'loc_1',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/1',
  reviewerName: 'Marcus Vance',
  rating: 5,
  comment: 'Fixed our leaky water heater in less than an hour.',
  sourceRevision: 'hash_pos_1',
  fetchedAt: '2026-10-15T10:00:00Z',
  expiresAt: '2026-11-14T10:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const classificationPos = ReviewClassificationService.classifyReview({
  rating: positiveReview.rating,
  comment: positiveReview.comment,
  reviewerName: positiveReview.reviewerName
});

const draftPos = ReplyDraftGenerationService.generateReplyDraft({
  review: positiveReview,
  classification: classificationPos,
  options: mockOptions
});

console.log('✓ Positive draft generated:', draftPos.text);
if (!draftPos.groundingVerification.passedAllChecks) {
  throw new Error('Positive draft failed deterministic grounding verification');
}
if (draftPos.requiresHumanReview) {
  throw new Error('Uncomplicated 5-star review should not mandate human review');
}

// 2. Sensitive / complaint review draft generation -> MUST require human review
const complaintReview: ReviewResource = {
  id: 'rev_neg_1',
  organizationId: 'org_1',
  locationId: 'loc_1',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/2',
  reviewerName: 'Karen Peterson',
  rating: 1,
  comment: 'Technician left dirt all over our tiles and was rude.',
  sourceRevision: 'hash_neg_1',
  fetchedAt: '2026-10-15T11:00:00Z',
  expiresAt: '2026-11-14T11:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const classificationNeg = ReviewClassificationService.classifyReview({
  rating: complaintReview.rating,
  comment: complaintReview.comment,
  reviewerName: complaintReview.reviewerName
});

const draftNeg = ReplyDraftGenerationService.generateReplyDraft({
  review: complaintReview,
  classification: classificationNeg,
  options: mockOptions
});

console.log('✓ Negative draft generated:', draftNeg.text);
if (!draftNeg.requiresHumanReview) {
  throw new Error('Negative/complaint cases must remain drafts for human review');
}
if (!draftNeg.text.includes(mockOptions.confirmedPhone) || !draftNeg.text.includes(mockOptions.confirmedPublicEmail)) {
  throw new Error('Complaint reply should provide official confirmed contact channels');
}
if (!draftNeg.groundingVerification.passedAllChecks) {
  throw new Error('Complaint draft failed grounding checks');
}

// 3. Test guard against prohibited content: compensation promise, removal request, marketing
const badDraftCompensation = 'Karen, please delete your review and we will issue a full refund and gift card!';
const badVerif = ReplyDraftGenerationService.verifyDraftGrounding(badDraftCompensation, mockOptions, complaintReview.comment);

if (!badVerif.containsCompensationPromise) {
  throw new Error('Failed to catch compensation promise');
}
if (!badVerif.containsReviewRemovalRequest) {
  throw new Error('Failed to catch review removal request');
}
if (badVerif.passedAllChecks) {
  throw new Error('Bad draft should fail grounding verification');
}
console.log('✓ Grounding guards caught prohibited compensation promise and review removal request');

// 4. Test versioning on edit: owner edit creates a new revision instead of mutating an already approved payload invisibly
draftPos.status = 'APPROVED'; // Simulate prior approval
const updatedDraft = ReplyDraftGenerationService.updateDraft({
  draftId: draftPos.draftId,
  newText: 'Marcus, huge thanks from the whole Apex Plumbing crew in Seattle! Reach out anytime.',
  options: mockOptions,
  originalComment: positiveReview.comment
});

console.log('✓ Updated draft version:', updatedDraft.version, 'status:', updatedDraft.status);
if (updatedDraft.version !== 2) {
  throw new Error(`Expected version 2, got ${updatedDraft.version}`);
}
if (updatedDraft.status !== 'DRAFT') {
  throw new Error('Editing an approved draft must reset status to DRAFT to prevent invisible mutation');
}

console.log('✓ All Prompt 071 tests passed successfully!');
