import { ServiceRecoveryService } from '../packages/domain/src/serviceRecoveryService.js';
import { ReviewResource } from '@localpilot/contracts';

console.log('--- Testing Prompt 079: Service Recovery and Review-Policy Reporting Tasks ---');

ServiceRecoveryService.reset();

const mockReview: ReviewResource = {
  id: 'rev_recovery_01',
  organizationId: 'org_rec',
  locationId: 'loc_rec',
  provider: 'google_business_profile',
  externalResourceId: 'accounts/1/locations/1/reviews/rec_01',
  reviewerName: 'Marcus Brodie',
  rating: 1,
  comment: 'Dispatcher charged me $450 for 10 minutes of unclogging and refused to explain bill.',
  sourceRevision: 'hash_rec_01',
  fetchedAt: '2026-10-22T09:00:00Z',
  expiresAt: '2026-11-21T09:00:00Z',
  existingReply: null,
  isDeleted: false,
  purgedAt: null
};

// 1. Acceptance check: Resolving a complaint conditioned on changing rating is strictly blocked
let ratingConditionBlocked = false;
try {
  ServiceRecoveryService.createCase({
    review: mockReview,
    assignedUserId: 'mgr_dave',
    complaintSummary: 'Billing dispute over $450 drain charge',
    privateDetails: { orderNumber: 'INV-9988', invoiceAmount: '$450.00' },
    isConditionedOnRatingChange: true // Prohibited!
  });
} catch (e: any) {
  ratingConditionBlocked = true;
  console.log('✓ Conditioning resolution on rating change blocked:', e.message);
}
if (!ratingConditionBlocked) {
  throw new Error('Failed to block conditioning resolution on rating change');
}

// 2. Create valid private operational case
const recoveryCase = ServiceRecoveryService.createCase({
  review: mockReview,
  assignedUserId: 'mgr_dave',
  complaintSummary: 'Billing dispute over $450 drain charge',
  privateDetails: {
    orderNumber: 'INV-9988',
    invoiceAmount: '$450.00',
    customerDirectPhone: '555-0144'
  }
});

console.log('✓ Private operational case created:', recoveryCase.caseId, 'Status:', recoveryCase.resolutionStatus);
if (recoveryCase.isConditionedOnRatingChange) {
  throw new Error('Case must not be conditioned on rating change');
}

// 3. Acceptance check: Public draft leaking private details is blocked
let privacyLeakBlocked = false;
try {
  ServiceRecoveryService.confirmResolution({
    caseId: recoveryCase.caseId,
    status: 'RESOLVED_SATISFIED',
    internalResolutionNotes: 'Called customer, adjusted $150 labor fee on invoice INV-9988.',
    publicDraftText: 'Marcus, we refunded $150 on invoice INV-9988 to your phone 555-0144.' // Leaks private data!
  });
} catch (e: any) {
  privacyLeakBlocked = true;
  console.log('✓ Privacy leak blocked in public response draft:', e.message);
}
if (!privacyLeakBlocked) {
  throw new Error('Failed to block privacy leak in public draft');
}

// 4. Acceptance check: Fraud accusation in public draft is blocked
let fraudAccusationBlocked = false;
try {
  ServiceRecoveryService.confirmResolution({
    caseId: recoveryCase.caseId,
    status: 'RESOLVED_UNRESPONSIVE',
    internalResolutionNotes: 'Customer did not pick up phone.',
    publicDraftText: 'Marcus is a fake customer and a competitor bot committing fraud.' // Prohibited!
  });
} catch (e: any) {
  fraudAccusationBlocked = true;
  console.log('✓ Fraud accusation in public reply blocked:', e.message);
}
if (!fraudAccusationBlocked) {
  throw new Error('Failed to block fraud accusation in public reply draft');
}

// 5. Valid resolution confirmation with cautious public draft
const resolvedCase = ServiceRecoveryService.confirmResolution({
  caseId: recoveryCase.caseId,
  status: 'RESOLVED_SATISFIED',
  internalResolutionNotes: 'Explained flat rate fee, customer satisfied with direct resolution.',
  publicDraftText: 'Marcus, thank you for taking the time to speak with our management team directly. We are glad we were able to review your service details and resolve this with you. We appreciate your feedback.'
});

console.log('✓ Case resolved cleanly. New status:', resolvedCase.resolutionStatus);
console.log('  Cautious public draft:', resolvedCase.cautiousPublicDraft);
if (resolvedCase.resolutionStatus !== 'RESOLVED_SATISFIED') {
  throw new Error('Expected status RESOLVED_SATISFIED');
}

// 6. Build suspected policy violation packet and verify no promised removal
const packet = ServiceRecoveryService.buildPolicyViolationPacket({
  review: mockReview,
  suspectedViolationReason: 'CONFLICT_OF_INTEREST',
  evidenceNotes: 'Reviewer name matches former disgruntled subcontractor.'
});

console.log('✓ Policy violation evidence packet created:', packet.packetId);
console.log('  Guidance URL:', packet.providerReportingGuidanceUrl);
console.log('  Disclaimer:', packet.removalGuaranteedDisclaimer);

if (!packet.removalGuaranteedDisclaimer.includes('does not guarantee removal')) {
  throw new Error('Policy violation packet must clearly state removal is not guaranteed');
}
if (!packet.autoPublishFraudAccusationBlocked) {
  throw new Error('autoPublishFraudAccusationBlocked must be true');
}

console.log('✓ All Prompt 079 tests passed successfully!');
