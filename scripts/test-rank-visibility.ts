import assert from 'assert';
import { RankVisibilityService } from '../packages/domain/src/rankVisibilityService.js';
import { PointObservation } from '../packages/contracts/src/rankCollection.js';

async function runTest() {
  console.log('Testing Prompt 055: Implement transparent visibility calculations...');

  // 1. Hand-Calculated Fixture:
  // 10 total points: 2 errors, 5 found, 3 not found in depth 20
  const sampleObservations: PointObservation[] = [
    { pointIndex: 0, latitude: 30.1, longitude: -97.1, state: 'FOUND', rank: 1, taskId: 't1', retryCount: 0 },
    { pointIndex: 1, latitude: 30.1, longitude: -97.2, state: 'FOUND', rank: 2, taskId: 't2', retryCount: 0 },
    { pointIndex: 2, latitude: 30.1, longitude: -97.3, state: 'FOUND', rank: 3, taskId: 't3', retryCount: 0 },
    { pointIndex: 3, latitude: 30.2, longitude: -97.1, state: 'FOUND', rank: 5, taskId: 't4', retryCount: 0 },
    { pointIndex: 4, latitude: 30.2, longitude: -97.2, state: 'FOUND', rank: 8, taskId: 't5', retryCount: 0 },
    { pointIndex: 5, latitude: 30.2, longitude: -97.3, state: 'NOT_FOUND_IN_DEPTH', rank: null, taskId: 't6', retryCount: 0 },
    { pointIndex: 6, latitude: 30.3, longitude: -97.1, state: 'NOT_FOUND_IN_DEPTH', rank: null, taskId: 't7', retryCount: 0 },
    { pointIndex: 7, latitude: 30.3, longitude: -97.2, state: 'NOT_FOUND_IN_DEPTH', rank: null, taskId: 't8', retryCount: 0 },
    { pointIndex: 8, latitude: 30.3, longitude: -97.3, state: 'TASK_FAILED', rank: null, taskId: 't9', retryCount: 2 }, // Error point 1
    { pointIndex: 9, latitude: 30.4, longitude: -97.1, state: 'TASK_FAILED', rank: null, taskId: 't10', retryCount: 2 } // Error point 2
  ];

  const metrics = RankVisibilityService.calculateMetrics(sampleObservations, 20);

  // Exact math assertions:
  assert.strictEqual(metrics.totalGridPoints, 10);
  assert.strictEqual(metrics.errorPointsCount, 2, '2 error points must be tracked');
  assert.strictEqual(metrics.evaluablePointsCount, 8, 'Evaluable points must be 8 (errors excluded)');
  assert.strictEqual(metrics.foundPointsCount, 5);
  assert.strictEqual(metrics.notFoundInDepthCount, 3);
  assert.strictEqual(metrics.top3PointsCount, 3);

  // Top 3 coverage: 3 / 8 = 37.50% (Excluding errors prevents false dilution)
  assert.strictEqual(metrics.top3CoveragePercent, 37.5);
  console.log(`✓ Top-3 coverage matches hand calculation: ${metrics.top3CoveragePercent}% (3 / 8 evaluable points)`);

  // Found-only average rank: (1 + 2 + 3 + 5 + 8) / 5 = 19 / 5 = 3.8
  assert.strictEqual(metrics.averageFoundRank, 3.8);
  console.log(`✓ Average found rank matches hand calculation: ${metrics.averageFoundRank} across 5 found points`);

  // Labeled Capped Average Rank: (1+2+3+5+8 + 21+21+21) / 8 = 82 / 8 = 10.25
  assert.strictEqual(metrics.labeledCappedAverageRank, 10.25);
  assert.strictEqual(metrics.cappedDepthValue, 21);
  console.log(`✓ Labeled capped average rank matches hand calculation: ${metrics.labeledCappedAverageRank} (depth capped at 21)`);

  // Formula transparency
  assert(metrics.denominatorFormulaText.includes('8 evaluable points (10 grid points - 2 provider error points excluded)'));
  assert(metrics.explanation.includes('Top 3 coverage of 37.5%'));
  console.log('✓ Explanations and formula denominator details verified');

  // 2. Zero evaluable points (all failed tasks)
  const allFailed: PointObservation[] = [
    { pointIndex: 0, latitude: 30.1, longitude: -97.1, state: 'TASK_FAILED', rank: null, taskId: 'err1', retryCount: 2 },
    { pointIndex: 1, latitude: 30.1, longitude: -97.2, state: 'TASK_FAILED', rank: null, taskId: 'err2', retryCount: 2 }
  ];

  const unavailableMetrics = RankVisibilityService.calculateMetrics(allFailed, 20);
  assert.strictEqual(unavailableMetrics.isUnavailable, true);
  assert.strictEqual(unavailableMetrics.top3CoveragePercent, null, 'Zero points must return null, never 0%');
  assert.strictEqual(unavailableMetrics.averageFoundRank, null);
  assert.strictEqual(unavailableMetrics.labeledCappedAverageRank, null);
  console.log('✓ Zero evaluable points correctly yields unavailable (null) instead of false 0% or zero average');

  console.log('Prompt 055 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
