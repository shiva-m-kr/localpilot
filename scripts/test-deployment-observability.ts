import assert from 'node:assert/strict';
import {
  DeploymentObservabilityService,
  ObservabilityStorage,
} from '@localpilot/domain';

async function runDeploymentObservabilityTests() {
  console.log('--- Testing Deployment Observability, Restore and Rollback (Prompt 099) ---');

  let dbLatency = 12; // 12ms healthy
  let dlqCount = 0;
  let oldestJobAge = 15; // 15 seconds

  const mockStorage: ObservabilityStorage = {
    async getDbHealth() {
      return { latencyMs: dbLatency, activeConnections: 8 };
    },
    async getQueueMetrics() {
      return { activeWorkers: 4, oldestJobAgeSec: oldestJobAge, dlqCount };
    },
    async getKillSwitchState() {
      return { isGlobalPaused: false, pausedLocations: 1 };
    },
  };

  const service = new DeploymentObservabilityService(mockStorage);

  // Test 1: Healthy System Overview
  console.log('Test 1: Healthy system overview');
  const healthyOverview = await service.getHealthOverview('PRODUCTION');
  assert.equal(healthyOverview.status, 'HEALTHY');
  assert.equal(healthyOverview.database.latencyMs, 12);
  assert.equal(healthyOverview.workerQueues.deadLetterQueueCount, 0);
  assert.equal(healthyOverview.alerts.length, 0);

  // Test 2: Degraded Queue & Alerts
  console.log('Test 2: Degraded queue raises alerts');
  dlqCount = 2; // Simulate 2 failed dead letter jobs
  const degradedOverview = await service.getHealthOverview('PRODUCTION');
  assert.equal(degradedOverview.status, 'DEGRADED');
  assert.ok(degradedOverview.alerts.some(a => a.includes('Dead Letter Queue')));

  // Test 3: Disaster Recovery Restore Drill
  console.log('Test 3: Disaster Recovery Restore Drill (RPO <= 24h, RTO <= 8h)');
  const drillReport = await service.executeRestoreDrill('Primary database VM disk corruption simulation');

  assert.equal(drillReport.isRpoRtoAchieved, true);
  assert.ok(drillReport.rpoObservedHours <= drillReport.rpoTargetHours, 'Observed RPO must be within 24h target');
  assert.ok(drillReport.rtoObservedHours <= drillReport.rtoTargetHours, 'Observed RTO must be within 8h target');
  assert.equal(drillReport.deduplicationAsserted, true, 'Restored DB must not re-dispatch completed external writes');
  assert.equal(drillReport.secretsDecryptionAsserted, true, 'Integration tokens must decrypt with valid keys');
  assert.equal(drillReport.expiredTtlSourcePurged, true, 'TTL expired records must be purged');

  console.log('Prompt 099 verified successfully!\n');
}

runDeploymentObservabilityTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
