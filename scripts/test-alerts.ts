import assert from 'assert';
import crypto from 'crypto';
import { AlertService, ValidationFailedError } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 027: OWNER NOTIFICATIONS & ACTIONABLE ALERTS VERIFICATION ---');

  AlertService.clear();

  const tenantId = crypto.randomUUID();

  // 1. Publish persistent alert: Automation Pause active
  const pauseAlert = AlertService.publishAlert({
    organizationId: tenantId,
    type: 'PAUSE_ACTIVE',
    severity: 'warning',
    title: 'Automation Paused Globally',
    message: 'All scheduled publications and scans are on hold until resumed.',
    actionUrl: '/settings/automation',
    actionLabel: 'Resume Automation',
    dedupKey: 'global_pause_active'
  });

  assert.strictEqual(pauseAlert.isPersistent, true);
  console.log('✓ Global pause alert created with mandatory persistent visibility.');

  // 2. Persistent alert cannot be dismissed casually as a disappearing toast
  assert.throws(
    () => {
      AlertService.acknowledgeAlert(pauseAlert.id, false);
    },
    (err: any) => {
      assert.ok(err instanceof ValidationFailedError);
      assert.ok(err.message.includes('cannot be dismissed until the underlying operational condition is resolved'));
      return true;
    }
  );
  console.log('✓ Persistent alert cannot be dismissed while underlying operational condition remains active.');

  // 3. Unresolved public-write state is persistent
  const unknownOutcomeAlert = AlertService.publishAlert({
    organizationId: tenantId,
    type: 'UNKNOWN_OUTCOME',
    severity: 'critical',
    title: 'Google Business Profile Write Ambiguous',
    message: 'Write operation timed out during post creation. Reconciliation in progress.',
    actionUrl: '/posts/recon-1',
    actionLabel: 'View Status',
    dedupKey: 'unknown_outcome:gbp:post-456'
  });
  assert.strictEqual(unknownOutcomeAlert.isPersistent, true);
  console.log('✓ Unresolved external write outcome is marked persistent.');

  // 4. Alert deduplication prevents flooding users
  // Suppose 5 consecutive failures trigger alerts for the same integration reconnect requirement
  for (let i = 0; i < 5; i++) {
    AlertService.publishAlert({
      organizationId: tenantId,
      type: 'RECONNECT_REQUIRED',
      severity: 'critical',
      title: 'GBP Reconnection Required',
      message: 'Token expired. Please re-authorize.',
      actionUrl: '/settings/connections',
      actionLabel: 'Reconnect',
      dedupKey: 'reconnect:google_business_profile'
    });
  }

  const activeAlerts = AlertService.getActiveAlerts(tenantId);
  const reconnectAlerts = activeAlerts.filter((a) => a.dedupKey === 'reconnect:google_business_profile');
  assert.strictEqual(reconnectAlerts.length, 1);
  assert.strictEqual(reconnectAlerts[0].occurrenceCount, 5);
  console.log('✓ Deduplication verified: 5 consecutive alerts consolidated into 1 alert record with occurrence count 5.');

  // 5. Secret Redaction: Ensure secrets and raw tokens are stripped from alert messages
  const secretAlert = AlertService.publishAlert({
    organizationId: tenantId,
    type: 'JOB_FAILURE',
    severity: 'warning',
    title: 'Sync Failed',
    message: 'Failed to authenticate using bearer sk-proj-1234567890abcdef and key=secret12345678',
    actionUrl: '/jobs/123',
    actionLabel: 'View Diagnostics',
    dedupKey: 'job_failure:123'
  });

  assert.ok(!secretAlert.message.includes('sk-proj-'));
  assert.ok(!secretAlert.message.includes('secret12345678'));
  assert.ok(secretAlert.message.includes('[REDACTED_SECRET]'));
  console.log('✓ Alert message successfully redacted sensitive credentials and tokens.');

  console.log('--- PROMPT 027 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
