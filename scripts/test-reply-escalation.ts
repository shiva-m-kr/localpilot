import { ReplyEscalationService } from '../packages/domain/src/replyEscalationService.js';
import { ReviewResource, GeneratedReplyDraft } from '@localpilot/contracts';

console.log('--- Testing Prompt 072: Reply Approval, Assignment and Escalation ---');

ReplyEscalationService.reset();

const mockReview: ReviewResource = {
  id: 'rev_complaint_99',
  organizationId: 'org_plumb',
  locationId: 'loc_north_branch',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/north/reviews/99',
  reviewerName: 'Victor Cruz',
  rating: 1,
  comment: 'Main shutoff valve failed during repair and flooded basement.',
  sourceRevision: 'revision_initial_hash_123',
  fetchedAt: '2026-10-16T08:00:00Z',
  expiresAt: '2026-11-15T08:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const mockDraft: GeneratedReplyDraft = {
  draftId: 'draft_99',
  reviewResourceId: mockReview.id,
  sourceRevisionHash: mockReview.sourceRevision,
  text: 'Victor, thank you for alerting us. Please call our master plumber directly at 555-0100.',
  version: 1,
  requiresHumanReview: true,
  groundingVerification: {
    containsRepetitiveMarketing: false,
    containsKeywordStuffing: false,
    containsInventedTransaction: false,
    containsPrivateCustomerInfo: false,
    containsCompensationPromise: false,
    containsReviewRemovalRequest: false,
    publicContactPhoneVerified: true,
    passedAllChecks: true
  },
  status: 'DRAFT',
  createdAt: '2026-10-16T08:05:00Z',
  updatedAt: '2026-10-16T08:05:00Z'
};

// 1. Complaint creates an owner task rather than forced automatic apology
const task = ReplyEscalationService.createEscalationTask({
  review: mockReview,
  escalationCategory: 'CUSTOMER_COMPLAINT',
  assignedUserId: 'user_owner_joe',
  deadlineHours: 24,
  initialNote: 'Dispatcher notified; master plumber scheduled to inspect basement.'
});

console.log('✓ Complaint escalation task created:', task.taskId, 'Category:', task.escalationCategory);
if (task.escalationCategory !== 'CUSTOMER_COMPLAINT') {
  throw new Error('Complaint should have CUSTOMER_COMPLAINT escalation category');
}

// 2. Add private internal support notes
const note = ReplyEscalationService.addInternalSupportNote({
  taskId: task.taskId,
  authorUserId: 'user_support_ann',
  text: 'Customer requested inspection report for their insurance claim.'
});

console.log('✓ Internal private support note added:', note.text);
if (!note.isPrivateSupportNote) {
  throw new Error('Support note must be flagged as private');
}

// 3. Verify private notes are strictly excluded from public payload
const publicPayload = ReplyEscalationService.getPublicReplyPayload({
  draft: mockDraft,
  task
});

console.log('✓ Public payload comment:', publicPayload.publicComment);
if ((publicPayload as any).internalNotes || JSON.stringify(publicPayload).includes('insurance claim')) {
  throw new Error('Private internal support notes leaked into public payload!');
}

// 4. Test unauthorized location check (prevent forged resource ID reply)
let forgeryBlocked = false;
try {
  ReplyEscalationService.approveReplyWithBinding({
    review: mockReview,
    draft: mockDraft,
    userId: 'user_south_manager',
    userAssignedLocationIds: ['loc_south_branch'] // User only has south branch, trying to approve north branch!
  });
} catch (e: any) {
  forgeryBlocked = true;
  console.log('✓ Cross-location approval forgery correctly blocked:', e.message);
}
if (!forgeryBlocked) {
  throw new Error('User was able to approve review for an unassigned location');
}

// 5. Valid approval with hash binding
const validBinding = ReplyEscalationService.approveReplyWithBinding({
  review: mockReview,
  draft: mockDraft,
  userId: 'user_north_manager',
  userAssignedLocationIds: ['loc_north_branch']
});

console.log('✓ Approval binding created:', validBinding.approvalId, 'boundDraftHash:', validBinding.boundDraftHash);

// 6. Acceptance test: Stale source review invalidates approval
const updatedReview: ReviewResource = {
  ...mockReview,
  sourceRevision: 'revision_altered_by_customer_456',
  comment: 'Follow up: Company called and apologized, but damage remains.'
};

const validationStaleSource = ReplyEscalationService.validateApprovalBinding({
  approvalId: validBinding.approvalId,
  currentReview: updatedReview,
  currentDraftText: mockDraft.text
});

console.log('✓ Stale source validation result:', validationStaleSource);
if (validationStaleSource.isValid) {
  throw new Error('Stale source review must invalidate approval binding');
}

// 7. Acceptance test: Edited draft text invalidates approval
const validationEditedDraft = ReplyEscalationService.validateApprovalBinding({
  approvalId: validBinding.approvalId,
  currentReview: mockReview,
  currentDraftText: 'Victor, we edited this text without re-approval.'
});

console.log('✓ Edited draft validation result:', validationEditedDraft);
if (validationEditedDraft.isValid) {
  throw new Error('Edited draft text must invalidate approval binding');
}

console.log('✓ All Prompt 072 tests passed successfully!');
