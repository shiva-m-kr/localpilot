import assert from 'assert';
import crypto from 'crypto';
import { QueueService } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 021: DURABLE BACKGROUND JOBS VERIFICATION ---');

  QueueService.clear();

  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();

  // 1. Enqueue across lanes
  const job1 = QueueService.enqueue({
    organizationId: tenantA,
    lane: 'publication',
    jobType: 'publish_wordpress_post',
    payload: { title: 'Emergency Plumbing in North York' }
  });

  assert.strictEqual(job1.status, 'queued');
  assert.strictEqual(job1.lane, 'publication');
  console.log('✓ Successfully enqueued job to publication lane.');

  // 2. Worker 1 leases job
  const worker1 = 'worker-node-1';
  const leasedJob = QueueService.acquireNextJob({
    workerId: worker1,
    lane: 'publication',
    leaseDurationMs: 100 // Short lease for testing expiry
  });

  assert.ok(leasedJob);
  assert.strictEqual(leasedJob.id, job1.id);
  assert.strictEqual(leasedJob.status, 'leased');
  assert.strictEqual(leasedJob.workerId, worker1);
  console.log('✓ Worker 1 successfully acquired job lease.');

  // 3. Worker restart / crash simulation: Lease expires, worker restarted -> Work resumes!
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(150);

  const reclaimed = QueueService.reclaimExpiredLeases();
  assert.strictEqual(reclaimed, 1);
  const recheckJob = QueueService.getJob(job1.id);
  assert.strictEqual(recheckJob?.status, 'queued');
  assert.strictEqual(recheckJob?.workerId, undefined);
  console.log('✓ Worker crash/expiry detected: lease automatically reclaimed and reset to queued.');

  // Worker 2 (restarted worker) picks up the same job and heartbeats it
  const worker2 = 'worker-node-2';
  const resumedJob = QueueService.acquireNextJob({
    workerId: worker2,
    lane: 'publication',
    leaseDurationMs: 30_000
  });

  assert.ok(resumedJob);
  assert.strictEqual(resumedJob.id, job1.id);
  assert.strictEqual(resumedJob.workerId, worker2);

  // Heartbeat extends lease
  QueueService.heartbeat(resumedJob.id, worker2, 60_000);
  const heartbeatedJob = QueueService.getJob(resumedJob.id);
  assert.strictEqual(heartbeatedJob?.status, 'running');
  console.log('✓ Resumed job after worker restart and successfully sent lease heartbeat.');

  // 4. Secret Redaction in Diagnostics
  const simulatedError = new Error('Failed to connect with token=ghp_ABC123456789012345678901234567890123 and bearer secret12345678');
  QueueService.failJob(resumedJob.id, worker2, simulatedError);

  const failedJob = QueueService.getJob(resumedJob.id);
  assert.ok(failedJob?.diagnostics);
  assert.strictEqual(failedJob.diagnostics.isSanitized, true);
  assert.ok(!failedJob.diagnostics.errorMessage.includes('ghp_'));
  assert.ok(!failedJob.diagnostics.errorMessage.includes('secret12345678'));
  assert.ok(failedJob.diagnostics.errorMessage.includes('[REDACTED_SECRET]'));
  console.log('✓ Failed job diagnostic messages sanitized with all secrets redacted.');

  // 5. Tenant Fair-Share Concurrency (Anti-Starvation)
  for (let i = 0; i < 5; i++) {
    QueueService.enqueue({
      organizationId: tenantA,
      lane: 'generation',
      jobType: 'generate_post_draft',
      payload: { index: i }
    });
  }

  const tenantBJob = QueueService.enqueue({
    organizationId: tenantB,
    lane: 'generation',
    jobType: 'generate_post_draft',
    payload: { urgent: true }
  });

  const t1 = QueueService.acquireNextJob({ workerId: 'wA1', lane: 'generation', maxPerTenantConcurrency: 2 });
  const t2 = QueueService.acquireNextJob({ workerId: 'wA2', lane: 'generation', maxPerTenantConcurrency: 2 });
  assert.strictEqual(t1?.organizationId, tenantA);
  assert.strictEqual(t2?.organizationId, tenantA);

  // Third lease request: Tenant A is at max capacity (2 active jobs), so Tenant B's job MUST be selected
  const t3 = QueueService.acquireNextJob({ workerId: 'wB1', lane: 'generation', maxPerTenantConcurrency: 2 });
  assert.ok(t3);
  assert.strictEqual(t3.organizationId, tenantB);
  assert.strictEqual(t3.id, tenantBJob.id);
  console.log('✓ Tenant fair-share concurrency verified: busy Tenant A does not starve Tenant B.');

  console.log('--- PROMPT 021 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
