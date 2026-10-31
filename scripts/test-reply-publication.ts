import { ReplyPublicationPipeline, ProviderReplyClient } from '../packages/domain/src/replyPublicationPipeline.js';
import { ReplyEscalationService } from '../packages/domain/src/replyEscalationService.js';
import { BudgetService } from '../packages/domain/src/budgetService.js';
import { AutomationControlService } from '../packages/domain/src/automationControlService.js';
import { ReviewResource, GeneratedReplyDraft } from '@localpilot/contracts';

console.log('--- Testing Prompt 074: Safe Review Reply Publication and Readback ---');

ReplyPublicationPipeline.reset();
ReplyEscalationService.reset();
BudgetService.clear();
AutomationControlService.reset();

const orgId = '11111111-1111-1111-1111-111111111111';

// Setup budget
BudgetService.setTenantAllowance(orgId, 100);

const mockReview: ReviewResource = {
  id: 'rev_pub_001',
  organizationId: orgId,
  locationId: 'loc_pub_1',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/rev_pub_001',
  reviewerName: 'Brenda Walsh',
  rating: 5,
  comment: 'Outstanding repair service today!',
  sourceRevision: 'revision_initial_hash',
  fetchedAt: '2026-10-19T09:00:00Z',
  expiresAt: '2026-11-18T09:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

const mockDraft: GeneratedReplyDraft = {
  draftId: 'draft_pub_001',
  reviewResourceId: mockReview.id,
  sourceRevisionHash: mockReview.sourceRevision,
  text: 'Thank you Brenda! We appreciate your business.',
  version: 1,
  requiresHumanReview: false,
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
  createdAt: '2026-10-19T09:05:00Z',
  updatedAt: '2026-10-19T09:05:00Z'
};

const binding = ReplyEscalationService.approveReplyWithBinding({
  review: mockReview,
  draft: mockDraft,
  userId: 'owner_user',
  userAssignedLocationIds: ['loc_pub_1']
});

// Mock client with in-memory live state
let liveReviewState: ReviewResource = { ...mockReview };

const mockClient: ProviderReplyClient = {
  fetchLiveReview: async () => ({ ...liveReviewState }),
  publishReply: async (params) => {
    liveReviewState.existingReply = {
      comment: params.comment,
      updateTime: new Date().toISOString()
    };
    return { success: true, updateTime: liveReviewState.existingReply.updateTime };
  },
  deleteReply: async () => {
    liveReviewState.existingReply = null;
    return { success: true };
  }
};

// 1. Successful publication and readback confirmation
async function runTests() {
  const result = await ReplyPublicationPipeline.publishReply(
    {
      organizationId: orgId,
      locationId: 'loc_pub_1',
      reviewResourceId: mockReview.id,
      draftId: mockDraft.draftId,
      approvalId: binding.approvalId,
      replyText: mockDraft.text
    },
    mockClient
  );

  console.log('✓ Publication result state:', result.state);
  console.log('  Business reply:', result.businessReplyComment);
  console.log('  Customer review:', result.customerReviewComment);

  if (result.state !== 'READBACK_CONFIRMED') {
    throw new Error(`Expected READBACK_CONFIRMED, got ${result.state}`);
  }
  if (!result.businessReplyComment || !result.customerReviewComment) {
    throw new Error('Must clearly distinguish business reply from customer review');
  }

  // 2. Overwrite prevention: Trying to send a DIFFERENT reply when an existing reply is already live
  const differentDraft: GeneratedReplyDraft = {
    ...mockDraft,
    draftId: 'draft_different',
    text: 'A completely different reply text that owner did not manually author on Google.'
  };

  const diffBinding = ReplyEscalationService.approveReplyWithBinding({
    review: liveReviewState,
    draft: differentDraft,
    userId: 'owner_user',
    userAssignedLocationIds: ['loc_pub_1'],
    forceOverrideExistingReply: true
  });

  const overwriteBlockedResult = await ReplyPublicationPipeline.publishReply(
    {
      organizationId: orgId,
      locationId: 'loc_pub_1',
      reviewResourceId: mockReview.id,
      draftId: differentDraft.draftId,
      approvalId: diffBinding.approvalId,
      replyText: differentDraft.text,
      forceOverwriteDifferentReply: false // Do not force overwrite!
    },
    mockClient
  );

  console.log('✓ Overwrite protection test:', overwriteBlockedResult.state);
  if (overwriteBlockedResult.state !== 'OVERWRITE_PREVENTED') {
    throw new Error(`Expected OVERWRITE_PREVENTED, got ${overwriteBlockedResult.state}`);
  }

  // 3. Timeout handling -> TIMEOUT_RECONCILING
  const timeoutClient: ProviderReplyClient = {
    fetchLiveReview: async () => ({ ...mockReview, existingReply: null }),
    publishReply: async () => ({ success: false, timedOut: true }),
    deleteReply: async () => ({ success: true })
  };

  const timeoutResult = await ReplyPublicationPipeline.publishReply(
    {
      organizationId: orgId,
      locationId: 'loc_pub_1',
      reviewResourceId: mockReview.id,
      draftId: mockDraft.draftId,
      approvalId: binding.approvalId,
      replyText: mockDraft.text
    },
    timeoutClient
  );

  console.log('✓ Timeout result state:', timeoutResult.state);
  if (timeoutResult.state !== 'TIMEOUT_RECONCILING') {
    throw new Error(`Expected TIMEOUT_RECONCILING, got ${timeoutResult.state}`);
  }

  // 4. Delete business reply test (explicitly deletes our reply, customer review remains intact)
  const deleteResult = await ReplyPublicationPipeline.deleteBusinessReply(mockReview.id, mockClient);
  console.log('✓ Delete reply result state:', deleteResult.state);
  console.log('  Business reply after deletion:', deleteResult.businessReplyComment);
  console.log('  Customer review after deletion:', deleteResult.customerReviewComment);

  if (deleteResult.state !== 'REPLY_DELETED') {
    throw new Error('Expected REPLY_DELETED');
  }
  if (deleteResult.businessReplyComment !== null) {
    throw new Error('Business reply should be null after deletion');
  }
  if (deleteResult.customerReviewComment !== 'Outstanding repair service today!') {
    throw new Error('Customer review must remain intact when business reply is deleted');
  }

  console.log('✓ All Prompt 074 tests passed successfully!');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
