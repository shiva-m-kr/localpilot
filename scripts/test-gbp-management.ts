import { randomUUID } from 'crypto';
import assert from 'assert';
import { GbpManagementService } from '../packages/domain/src/gbpManagementService.js';
import { ApprovalRequiredError, ValidationFailedError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 048: Add approved GBP updates and sensitive field proposals...');

  GbpManagementService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();
  const ownerUserId = randomUUID();

  // 1. Valid GBP Post Creation
  const post = GbpManagementService.createPost({
    organizationId: orgId,
    locationId: locId,
    topicType: 'STANDARD',
    summary: 'Our Austin team just finished a commercial roof restoration using reflective TPO membrane.',
    callToAction: { actionType: 'LEARN_MORE', url: 'https://apexroofing.example.com/commercial' }
  });

  assert.strictEqual(post.status, 'DRAFT');
  assert.strictEqual(post.topicType, 'STANDARD');
  console.log('✓ Valid GBP standard update created');

  // 2. Offer Validation: Expired offer rejected
  assert.throws(
    () => {
      GbpManagementService.createPost({
        organizationId: orgId,
        locationId: locId,
        topicType: 'OFFER',
        summary: 'Special spring roof tune-up discount coupon.',
        offer: {
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-02-01T00:00:00.000Z', // Expired in past!
          couponCode: 'SPRING50'
        }
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Expired offer must be rejected'
  );
  console.log('✓ Expired offer rejected deterministically (cannot be reused)');

  // 3. Rejected post remains visible
  const rejectedPost = GbpManagementService.recordPostRejection(
    post.id,
    'Image resolution too low or contains disallowed text overlays.'
  );
  assert.strictEqual(rejectedPost.status, 'REJECTED_BY_GBP');
  assert(rejectedPost.rejectionReason?.includes('Image resolution'));
  console.log('✓ Rejected GBP post retained in system with clear explanation');

  // 4. Sensitive Field Proposal: Address / Hours change
  const proposal = GbpManagementService.proposeSensitiveFieldChange({
    organizationId: orgId,
    locationId: locId,
    fieldType: 'REGULAR_HOURS',
    currentValue: 'Mon-Fri 08:00-17:00',
    proposedValue: 'Mon-Fri 07:30-18:00, Sat 09:00-14:00',
    rationale: 'Updated to reflect seasonal extended operating hours'
  });

  assert.strictEqual(proposal.status, 'PROPOSED');
  console.log('✓ Sensitive profile field proposal created in PROPOSED status');

  // 5. Attempting to apply sensitive change without approval FAILS
  assert.throws(
    () => {
      GbpManagementService.applySensitiveFieldProposal(proposal.proposalId);
    },
    (err: any) => err instanceof ApprovalRequiredError,
    'Applying unapproved sensitive field must throw ApprovalRequiredError'
  );
  console.log('✓ Sensitive profile changes strictly require owner approval before applying');

  // 6. Owner Approves and Applies Proposal -> Truth in SEO audit log
  GbpManagementService.approveProposal(proposal.proposalId, ownerUserId);
  const auditLog = GbpManagementService.applySensitiveFieldProposal(proposal.proposalId);

  assert.strictEqual(auditLog.oldValue, 'Mon-Fri 08:00-17:00');
  assert.strictEqual(auditLog.newValue, 'Mon-Fri 07:30-18:00, Sat 09:00-14:00');
  assert(
    auditLog.truthInSeoDisclaimer.includes('does not promise or guarantee rank increases'),
    'Audit log must enforce truth-in-SEO rule without claiming ranking boosts'
  );
  console.log('✓ Sensitive profile update applied and verified with Truth-in-SEO disclaimer');

  console.log('Prompt 048 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
