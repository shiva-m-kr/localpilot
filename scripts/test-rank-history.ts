import { randomUUID } from 'crypto';
import assert from 'assert';
import { RankHistoryService } from '../packages/domain/src/rankHistoryService.js';
import { RankGridConfigService } from '../packages/domain/src/rankGridConfigService.js';
import { ScanRunExecution, VisibilityMetrics } from '../packages/contracts/src/index.js';

async function runTest() {
  console.log('Testing Prompt 057: Add compatible history and anomaly investigation...');

  RankGridConfigService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();

  // Create baseline config (5x5, 2.0km)
  const configA = RankGridConfigService.createConfig({
    organizationId: orgId,
    locationId: locId,
    centerLat: 30.2672,
    centerLng: -97.7431,
    gridSize: '5x5',
    spacingKm: 2.0,
    keywords: ['roof repair austin'],
    device: 'MOBILE',
    depth: 20,
    target: { businessName: 'Apex Roofing', placeId: 'ChIJ_apex_1', hideResidentialStreetAddress: true, city: 'Austin', state: 'TX' }
  });

  // Create different config (changed spacing to 4.0km -> different hash)
  const configB_DifferentFootprint = RankGridConfigService.createConfig({
    organizationId: orgId,
    locationId: locId,
    centerLat: 30.2672,
    centerLng: -97.7431,
    gridSize: '5x5',
    spacingKm: 4.0, // Different spacing!
    keywords: ['roof repair austin'],
    device: 'MOBILE',
    depth: 20,
    target: { businessName: 'Apex Roofing', placeId: 'ChIJ_apex_1', hideResidentialStreetAddress: true, city: 'Austin', state: 'TX' }
  });

  const dummyRunA: ScanRunExecution = {
    runId: randomUUID(),
    configId: configA.configId,
    locationId: locId,
    organizationId: orgId,
    keyword: 'roof repair austin',
    status: 'COMPLETED_SUCCESS',
    totalPoints: 25,
    successfulPoints: 20,
    failedPoints: 0,
    notFoundPoints: 5,
    observations: [],
    extractedCompetitors: [],
    taskIds: [],
    startedAt: '2026-10-01T00:00:00Z',
    completedAt: '2026-10-01T00:05:00Z'
  };

  const dummyMetricsA: VisibilityMetrics = {
    totalGridPoints: 25,
    evaluablePointsCount: 25,
    errorPointsCount: 0,
    foundPointsCount: 20,
    notFoundInDepthCount: 5,
    top3PointsCount: 15,
    top3CoveragePercent: 60.0,
    top10CoveragePercent: 80.0,
    averageFoundRank: 2.5,
    labeledCappedAverageRank: 6.2,
    cappedDepthValue: 21,
    isUnavailable: false,
    denominatorFormulaText: '25 evaluable points',
    explanation: '60% top 3'
  };

  // 1. Ineligible comparison: Changed sampling footprint
  const ineligibleComp = RankHistoryService.compareRuns({
    baselineRun: dummyRunA,
    baselineConfig: configA,
    baselineMetrics: dummyMetricsA,
    candidateRun: { ...dummyRunA, runId: randomUUID() },
    candidateConfig: configB_DifferentFootprint,
    candidateMetrics: dummyMetricsA
  });

  assert.strictEqual(ineligibleComp.isEligible, false, 'Changed footprints must be marked ineligible');
  assert(ineligibleComp.ineligibilityReason?.includes('Sampling footprints differ'));
  console.log('✓ Ineligible comparison caught: Prevents misleading charts when grid footprints differ');

  // 2. Anomaly Detection on Significant Drop (under identical footprint)
  const dummyMetricsB_Drop: VisibilityMetrics = {
    ...dummyMetricsA,
    top3PointsCount: 5,
    top3CoveragePercent: 20.0, // Dropped from 60% to 20% (-40% delta!)
    averageFoundRank: 8.5
  };

  const anomalyComp = RankHistoryService.compareRuns({
    baselineRun: dummyRunA,
    baselineConfig: configA,
    baselineMetrics: dummyMetricsA,
    candidateRun: { ...dummyRunA, runId: randomUUID() },
    candidateConfig: configA, // Identical footprint!
    candidateMetrics: dummyMetricsB_Drop
  });

  assert.strictEqual(anomalyComp.isEligible, true);
  assert.strictEqual(anomalyComp.top3CoverageDeltaPercent, -40.0);
  assert.strictEqual(anomalyComp.isAnomaly, true);
  assert.strictEqual(anomalyComp.anomalySeverity, 'SIGNIFICANT_DROP');
  assert(anomalyComp.investigativeEvidenceTaskId, 'Must generate bounded evidence task ID');
  assert(
    anomalyComp.anomalyExplanation?.includes('Truth-in-SEO: No automated page rewrites or speculative algorithm penalty claims'),
    'Must enforce Truth-in-SEO without alleging algorithm causes'
  );
  console.log('✓ Significant drop flagged as anomaly with bounded investigation task (no automated page rewrites)');

  // 3. Normal variation
  const dummyMetricsC_Normal: VisibilityMetrics = {
    ...dummyMetricsA,
    top3PointsCount: 14,
    top3CoveragePercent: 56.0 // -4% delta (normal)
  };

  const normalComp = RankHistoryService.compareRuns({
    baselineRun: dummyRunA,
    baselineConfig: configA,
    baselineMetrics: dummyMetricsA,
    candidateRun: { ...dummyRunA, runId: randomUUID() },
    candidateConfig: configA,
    candidateMetrics: dummyMetricsC_Normal
  });

  assert.strictEqual(normalComp.isAnomaly, false);
  assert.strictEqual(normalComp.anomalySeverity, 'NORMAL');
  console.log('✓ Normal minor variation (< 5%) classified without false alarm');

  console.log('Prompt 057 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
