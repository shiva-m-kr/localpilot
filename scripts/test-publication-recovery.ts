import { randomUUID } from 'crypto';
import assert from 'assert';
import { PublicationRecoveryService } from '../packages/domain/src/publicationRecoveryService.js';

async function runTest() {
  console.log('Testing Prompt 047: Implement publication recovery and owner intervention...');

  PublicationRecoveryService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();
  const expectedHash = 'hash-abc-1234567890';

  // 1. Truth-in-Publishing: Unknown outcome NEVER displays published
  const timeoutIncident = PublicationRecoveryService.recordIncident({
    organizationId: orgId,
    locationId: locId,
    provider: 'wordpress',
    externalId: 'post-101',
    incidentType: 'TIMEOUT_AFTER_ACCEPTANCE',
    expectedHash,
    errorSummary: 'Network timeout after WordPress accepted HTTP connection'
  });

  const displayStatus = PublicationRecoveryService.getDisplayStatus(timeoutIncident);
  assert.notStrictEqual(displayStatus.badge, 'published', 'Unknown outcome must NEVER display published');
  assert(displayStatus.label.includes('Pending Reconciliation') || displayStatus.label.includes('Needs'));
  console.log('✓ Truth-in-publishing: Unconfirmed outcome displays warning/pending, never published');

  // 2. Safe Reconciliation: Remote write succeeded previously
  const reconcileSuccessResult = await PublicationRecoveryService.reconcileBeforeRetry(
    timeoutIncident.incidentId,
    async () => ({
      found: true,
      externalId: 'post-101',
      remoteContentHash: expectedHash // Matches!
    })
  );

  assert.strictEqual(reconcileSuccessResult.canProceedWithRetry, false, 'Should not retry when post already exists');
  assert.strictEqual(reconcileSuccessResult.incident.status, 'RECONCILED_SUCCESS');
  const resolvedStatus = PublicationRecoveryService.getDisplayStatus(reconcileSuccessResult.incident);
  assert.strictEqual(resolvedStatus.badge, 'published');
  console.log('✓ Reconciled previous write via external ID without repeating side effects');

  // 3. Remote Content Drift Protection: Protect manual edits on provider
  const driftIncident = PublicationRecoveryService.recordIncident({
    organizationId: orgId,
    locationId: locId,
    provider: 'wordpress',
    externalId: 'post-202',
    incidentType: 'TIMEOUT_AFTER_ACCEPTANCE',
    expectedHash,
    errorSummary: 'Connection reset'
  });

  const driftResult = await PublicationRecoveryService.reconcileBeforeRetry(
    driftIncident.incidentId,
    async () => ({
      found: true,
      externalId: 'post-202',
      remoteContentHash: 'hash-different-remote-manual-edit' // DRIFT!
    })
  );

  assert.strictEqual(driftResult.canProceedWithRetry, false, 'Blind overwrite must be blocked when remote drifted');
  assert.strictEqual(driftResult.incident.incidentType, 'REMOTE_CONTENT_DRIFT');
  assert(driftResult.message.includes('modified manually'));
  console.log('✓ Remote drift detected: Manual provider edits protected from automated overwrite');

  // 4. Bounded Step Retries and Dead-Letter Transition
  const deadLetterIncident = PublicationRecoveryService.recordIncident({
    organizationId: orgId,
    locationId: locId,
    provider: 'facebook',
    incidentType: 'DEAD_LETTER_JOB',
    expectedHash,
    errorSummary: 'Graph API 500 error'
  });

  // Attempt 1 -> 2
  const attempt2 = await PublicationRecoveryService.reconcileBeforeRetry(
    deadLetterIncident.incidentId,
    async () => ({ found: false })
  );
  assert.strictEqual(attempt2.canProceedWithRetry, true);

  // Attempt 2 -> 3
  const attempt3 = await PublicationRecoveryService.reconcileBeforeRetry(
    deadLetterIncident.incidentId,
    async () => ({ found: false })
  );
  assert.strictEqual(attempt3.canProceedWithRetry, true);

  // Attempt 3 -> Exceeded limit -> Dead-Letter
  const attempt4 = await PublicationRecoveryService.reconcileBeforeRetry(
    deadLetterIncident.incidentId,
    async () => ({ found: false })
  );
  assert.strictEqual(attempt4.canProceedWithRetry, false, 'Retries beyond max limit must be rejected');
  assert.strictEqual(attempt4.incident.incidentType, 'DEAD_LETTER_JOB');
  assert.strictEqual(attempt4.incident.status, 'NEEDS_OPERATOR_REVIEW');
  console.log('✓ Bounded step retries enforced: Exceeded attempts routed to dead-letter review');

  // 5. Operator Intervention
  const resolved = PublicationRecoveryService.resolveIncident(
    driftIncident.incidentId,
    'ADOPT_REMOTE_CONTENT',
    'Owner confirmed manual edits are accurate'
  );
  assert.strictEqual(resolved.status, 'RECONCILED_SUCCESS');
  console.log('✓ Operator successfully intervened and adopted remote content');

  console.log('Prompt 047 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
