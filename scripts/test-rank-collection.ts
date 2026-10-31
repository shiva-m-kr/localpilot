import { randomUUID } from 'crypto';
import assert from 'assert';
import { RankCollectionService } from '../packages/domain/src/rankCollectionService.js';
import { RankGridConfigService } from '../packages/domain/src/rankGridConfigService.js';

async function runTest() {
  console.log('Testing Prompt 054: Collect rank observations reliably...');

  RankCollectionService.reset();
  RankGridConfigService.reset();

  const orgId = randomUUID();
  const locId = randomUUID();
  const targetPlaceId = 'ChIJ_apex_north_99';

  // Create 3x3 grid (9 points)
  const config = RankGridConfigService.createConfig({
    organizationId: orgId,
    locationId: locId,
    centerLat: 30.2672,
    centerLng: -97.7431,
    gridSize: '3x3', // 9 points
    spacingKm: 2.0,
    keywords: ['roof repair austin'],
    device: 'MOBILE',
    depth: 20,
    target: {
      businessName: 'Apex Roofing & Restoration',
      placeId: targetPlaceId,
      hideResidentialStreetAddress: true,
      city: 'Austin',
      state: 'TX'
    }
  });

  // 1. Execute run where pointIndex 4 has provider internal task failure
  const run1 = await RankCollectionService.executeScanRun({
    config,
    keyword: 'roof repair austin',
    fetchPointTaskFn: async (pointIndex) => {
      if (pointIndex === 4) {
        // Transport HTTP 200, but task payload failure!
        return {
          taskId: 'task-err-pt4',
          isTaskError: true,
          errorMessage: 'Task timed out at provider rendering node',
          rank: null,
          found: false,
          competitors: []
        };
      }

      return {
        taskId: `task-ok-pt${pointIndex}`,
        isTaskError: false,
        rank: pointIndex === 0 ? 1 : pointIndex === 1 ? 3 : null,
        found: pointIndex === 0 || pointIndex === 1,
        competitors: [
          { placeId: 'ChIJ_comp_1', businessName: 'Competitor A Roofing', rank: 2, rating: 4.8, reviewCount: 95 },
          { placeId: 'ChIJ_comp_2', businessName: 'Austin Roof Pros', rank: 4, rating: 4.5, reviewCount: 42 }
        ]
      };
    }
  });

  // Verify task failure isolation
  assert.strictEqual(run1.status, 'PARTIAL_FAILURE', 'Run with 1 failed point must be PARTIAL_FAILURE');
  assert.strictEqual(run1.failedPoints, 1);
  assert.strictEqual(run1.successfulPoints, 2);
  assert.strictEqual(run1.notFoundPoints, 6);

  const failedPoint = run1.observations.find((o) => o.pointIndex === 4);
  assert(failedPoint);
  assert.strictEqual(failedPoint.state, 'TASK_FAILED');
  assert.strictEqual(failedPoint.rank, null, 'Task failure must strictly record rank as null, never 0 or fake rank');
  assert(failedPoint.taskError?.includes('Task timed out'));
  console.log('✓ Transport success with task failure safely recorded as TASK_FAILED (rank null, never 0)');

  // Verify simultaneous competitor extraction (no extra paid queries)
  assert(run1.extractedCompetitors.length > 0);
  assert(run1.extractedCompetitors.some((c) => c.businessName === 'Competitor A Roofing'));
  console.log(`✓ Simultaneously captured ${run1.extractedCompetitors.length} competitor observations from existing SERP sample`);

  // 2. Recovery of Partial Run (re-run only failed point)
  let retryInvocationCount = 0;
  const recoveredRun = await RankCollectionService.resumePartialRun(
    run1.runId,
    async (pointIndex) => {
      retryInvocationCount++;
      assert.strictEqual(pointIndex, 4, 'Only failed point 4 should be retried');
      return {
        taskId: 'task-retry-success-pt4',
        isTaskError: false,
        rank: 2,
        found: true,
        competitors: []
      };
    }
  );

  assert.strictEqual(retryInvocationCount, 1, 'Only the 1 failed point was re-queried');
  assert.strictEqual(recoveredRun.status, 'COMPLETED_SUCCESS');
  assert.strictEqual(recoveredRun.failedPoints, 0);
  assert.strictEqual(recoveredRun.successfulPoints, 3);
  const recoveredPoint = recoveredRun.observations.find((o) => o.pointIndex === 4);
  assert.strictEqual(recoveredPoint?.state, 'FOUND');
  assert.strictEqual(recoveredPoint?.rank, 2);
  console.log('✓ Partial run successfully resumed: only failed point re-run without re-querying completed points');

  console.log('Prompt 054 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
