import assert from 'assert';
import crypto from 'crypto';
import { OutboxService, QueueService } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 022: TRANSACTIONAL COMMANDS & OUTBOX VERIFICATION ---');

  OutboxService.clear();
  QueueService.clear();

  const tenantId = crypto.randomUUID();
  const postId = crypto.randomUUID();

  // 1. Atomically record resource change and outbox event
  const { command, outboxEvent } = OutboxService.recordTransactionalCommand({
    organizationId: tenantId,
    commandType: 'publish_post',
    aggregateType: 'post',
    aggregateId: postId,
    eventType: 'post.publish_requested',
    payloadVersion: 1,
    payload: { title: 'Emergency Winter Plumbing Tips', channel: 'wordpress' },
    targetLane: 'publication'
  });

  assert.strictEqual(command.status, 'received');
  assert.strictEqual(outboxEvent.status, 'pending');
  assert.strictEqual(outboxEvent.payloadVersion, 1);
  console.log('✓ Transactional command and pending outbox event recorded in atomic commit.');

  // 2. Simulated Crash Scenario:
  // Suppose the application crashed right after DB commit, before any queue call was made.
  // When the dispatcher runs after restart, it must discover the pending event and dispatch it!
  const dispatchedFirstRun = OutboxService.dispatchPendingEvents();
  assert.strictEqual(dispatchedFirstRun, 1);

  const updatedEvent = OutboxService.getOutboxEvent(outboxEvent.id);
  assert.strictEqual(updatedEvent?.status, 'dispatched');
  assert.ok(updatedEvent?.logicalJobId);

  const updatedCommand = OutboxService.getCommand(command.id);
  assert.strictEqual(updatedCommand?.status, 'processing');
  console.log('✓ Crash recovery verified: post-commit pending event dispatched without data loss.');

  // 3. Replay-Safety (Idempotency of Dispatcher)
  // Run dispatcher a second time immediately. It must NOT create duplicate jobs!
  const dispatchedSecondRun = OutboxService.dispatchPendingEvents();
  assert.strictEqual(dispatchedSecondRun, 0); // Zero duplicate jobs enqueued
  console.log('✓ Replay safety verified: repeated dispatcher runs do not duplicate logical jobs.');

  // 4. UI Polling with Backoff
  const poll1 = OutboxService.getPollingStatus(command.id, 1);
  assert.strictEqual(poll1.status, 'processing');
  assert.strictEqual(poll1.retryAfterMs, 1000);

  const poll2 = OutboxService.getPollingStatus(command.id, 2);
  assert.strictEqual(poll2.retryAfterMs, 2000);

  const poll3 = OutboxService.getPollingStatus(command.id, 3);
  assert.strictEqual(poll3.retryAfterMs, 4000);

  const poll4 = OutboxService.getPollingStatus(command.id, 4);
  assert.strictEqual(poll4.retryAfterMs, 8000);
  console.log('✓ UI polling status returns progressive exponential backoff (1s -> 2s -> 4s -> 8s).');

  // 5. Worker completes command
  OutboxService.updateCommand(command.id, 'completed', {
    publishedUrl: 'https://apexplumbing.example.com/winter-tips',
    externalId: 'wp-1092'
  });

  const finalStatus = OutboxService.getPollingStatus(command.id, 5);
  assert.strictEqual(finalStatus.status, 'completed');
  assert.strictEqual(finalStatus.result?.externalId, 'wp-1092');
  console.log('✓ Polling returns completed result to UI.');

  console.log('--- PROMPT 022 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
