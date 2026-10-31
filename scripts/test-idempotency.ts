import assert from 'assert';
import crypto from 'crypto';
import { IdempotencyService, QueueService } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 023: IDEMPOTENCY & EXTERNAL-OUTCOME STATES VERIFICATION ---');

  IdempotencyService.clear();
  QueueService.clear();

  const tenantId = crypto.randomUUID();
  const idempotencyKey = `publish:post:${crypto.randomUUID()}`;

  // 1. Initial user request creates operation
  const req1 = IdempotencyService.getOrCreateOperation(idempotencyKey, tenantId);
  assert.strictEqual(req1.isNew, true);
  assert.strictEqual(req1.record.status, 'in_progress');
  const commandId = req1.record.commandId;

  // 2. Duplicate user request returns existing operation/command
  const req2 = IdempotencyService.getOrCreateOperation(idempotencyKey, tenantId);
  assert.strictEqual(req2.isNew, false);
  assert.strictEqual(req2.record.commandId, commandId);
  console.log('✓ Duplicate user request returns existing command record without duplicate creation.');

  // 3. Task-level provider error test: HTTP 200 returned, but API payload contains OAuth error
  // (e.g. Meta Graph API returning HTTP 200 with code 190)
  const metaResponseWithTaskError = {
    error: {
      message: 'Error validating access token: Session has expired.',
      type: 'OAuthException',
      code: 190
    }
  };

  const classifiedMetaError = IdempotencyService.classifyProviderOutcome(
    200, // HTTP Transport succeeded!
    metaResponseWithTaskError,
    false
  );

  assert.strictEqual(classifiedMetaError.rawTransportSuccess, true);
  assert.strictEqual(classifiedMetaError.status, 'failed');
  assert.strictEqual(classifiedMetaError.failureCategory, 'AUTHORIZATION');
  assert.ok(classifiedMetaError.userAction?.includes('Reconnect required'));
  console.log('✓ Task-level provider errors accurately caught even when HTTP transport reports HTTP 200 OK.');

  // 4. Ambiguous External Write: Timed out during write / POST
  // A timed-out provider write must NEVER be blindly repeated
  const timedOutOutcome = IdempotencyService.classifyProviderOutcome(
    504,
    null,
    true // isTimeoutOrNetworkError = true
  );

  assert.strictEqual(timedOutOutcome.status, 'ambiguous');
  assert.strictEqual(timedOutOutcome.failureCategory, 'AMBIGUOUS_EXTERNAL_WRITE');
  assert.strictEqual(timedOutOutcome.reconciliationRequired, true);

  // Schedule reconciliation job on 'reconciliation' lane
  const reconJobId = IdempotencyService.scheduleReconciliation(
    tenantId,
    idempotencyKey,
    'google_business_profile',
    'location-123/posts'
  );

  assert.ok(reconJobId);
  const reconJob = QueueService.getJob(reconJobId);
  assert.strictEqual(reconJob?.lane, 'reconciliation');
  assert.strictEqual(reconJob?.jobType, 'reconcile_external_write');
  console.log('✓ Timed-out provider write is not blindly repeated; queued for automated reconciliation.');

  // 5. Capped retry with jitter
  const backoffAttempt1 = IdempotencyService.calculateBackoffWithJitter(1, 1000, 10000);
  const backoffAttempt2 = IdempotencyService.calculateBackoffWithJitter(2, 1000, 10000);
  const backoffAttempt10 = IdempotencyService.calculateBackoffWithJitter(10, 1000, 10000);

  assert.ok(backoffAttempt1 >= 750 && backoffAttempt1 <= 1250);
  assert.ok(backoffAttempt2 >= 1500 && backoffAttempt2 <= 2500);
  assert.ok(backoffAttempt10 <= 10000); // Capped at maxMs!
  console.log('✓ Transient retries calculate jittered backoff with strict upper bounds.');

  // 6. Complete operation
  IdempotencyService.completeOperation(idempotencyKey, { postUrl: 'https://example.com/p/123' });
  const completed = IdempotencyService.getOrCreateOperation(idempotencyKey, tenantId);
  assert.strictEqual(completed.isNew, false);
  assert.strictEqual(completed.record.status, 'completed');
  assert.strictEqual((completed.record.result as any)?.postUrl, 'https://example.com/p/123');
  console.log('✓ Operation completed and subsequent duplicate requests return finalized result.');

  console.log('--- PROMPT 023 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
