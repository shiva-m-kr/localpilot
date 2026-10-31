import assert from 'assert';
import {
  IntentClusterService,
  ValidationFailedError
} from '@localpilot/domain';
import { KeywordCandidate } from '@localpilot/contracts';

async function runTest() {
  console.log('--- RUNNING PROMPT 039: INTENT CLUSTERING & CANONICAL TARGET PAGES VERIFICATION ---');

  const existingPages = [
    {
      url: 'https://apexplumbing.example.com/drain-cleaning',
      title: 'Professional Drain Cleaning Services',
      targetService: 'Drain Cleaning'
    }
  ];

  const confirmedServiceAreas = ['North York', 'Toronto', 'Scarborough'];

  const keywords: KeywordCandidate[] = [
    {
      keyword: 'drain cleaning north york',
      service: 'Drain Cleaning',
      locality: 'North York',
      intent: 'TRANSACTIONAL',
      type: 'NON_BRANDED',
      locationIntent: 'EXPLICIT_LOCATION',
      monthlyVolume: 140,
      difficulty: 20,
      volumeSource: 'MEASURED_DATAFORSEO'
    },
    {
      keyword: 'emergency drain cleaning north york',
      service: 'Drain Cleaning',
      locality: 'North York',
      intent: 'TRANSACTIONAL',
      type: 'NON_BRANDED',
      locationIntent: 'EXPLICIT_LOCATION',
      monthlyVolume: 90,
      difficulty: 25,
      volumeSource: 'MEASURED_DATAFORSEO'
    },
    {
      keyword: 'water heater installation toronto',
      service: 'Water Heater Installation',
      locality: 'Toronto',
      intent: 'COMMERCIAL',
      type: 'NON_BRANDED',
      locationIntent: 'EXPLICIT_LOCATION',
      monthlyVolume: 210,
      difficulty: 30,
      volumeSource: 'MEASURED_DATAFORSEO'
    },
    // Unconfirmed locality (Potential Doorway Page proposal)
    {
      keyword: 'drain cleaning barrie',
      service: 'Drain Cleaning',
      locality: 'Barrie', // Barrie is NOT in confirmedServiceAreas!
      intent: 'TRANSACTIONAL',
      type: 'NON_BRANDED',
      locationIntent: 'EXPLICIT_LOCATION',
      monthlyVolume: 50,
      difficulty: 10,
      volumeSource: 'MEASURED_DATAFORSEO'
    }
  ];

  // 1. Cluster keywords
  const clusters = IntentClusterService.clusterKeywords(keywords, existingPages, confirmedServiceAreas);
  assert.strictEqual(clusters.length, 3); // Drain Cleaning North York, Water Heater Toronto, Drain Cleaning Barrie

  // 2. Canonical mapping and Consolidation:
  // Both "drain cleaning north york" and "emergency drain cleaning north york" are consolidated into 1 cluster
  const drainCluster = clusters.find((c) => c.service === 'Drain Cleaning' && c.targetLocality === 'North York');
  assert.ok(drainCluster);
  assert.strictEqual(drainCluster.mappedKeywords.length, 2);
  assert.strictEqual(drainCluster.recommendedCanonicalUrl, 'https://apexplumbing.example.com/drain-cleaning');
  // Recommends updating existing canonical page rather than creating a thin redundant competing page!
  assert.strictEqual(drainCluster.actionType, 'IMPROVE_EXISTING_CANONICAL');
  console.log('✓ Consolidated multiple related queries into 1 cluster mapped to existing canonical URL (IMPROVE_EXISTING_CANONICAL).');

  // 3. New Canonical Page mapping for Water Heater Installation
  const heaterCluster = clusters.find((c) => c.service === 'Water Heater Installation');
  assert.ok(heaterCluster);
  assert.strictEqual(heaterCluster.actionType, 'CREATE_NEW_PAGE');
  assert.strictEqual(heaterCluster.recommendedCanonicalUrl, 'https://apexplumbing.example.com/services/water-heater-installation');
  console.log('✓ Created clean canonical target URL for new service cluster.');

  // 4. Doorway Page Acceptance: Block city-name-swapped doorway proposals outside service coverage
  const doorwayCluster = clusters.find((c) => c.targetLocality === 'Barrie');
  assert.ok(doorwayCluster);
  assert.strictEqual(doorwayCluster.doorwayRisk, true);

  assert.throws(
    () => {
      IntentClusterService.assertDoorwayAndCannibalizationSafe(doorwayCluster);
    },
    (err: any) => {
      assert.ok(err instanceof ValidationFailedError);
      assert.ok(err.message.includes('Doorway Page Detected'));
      return true;
    }
  );
  console.log('✓ City-name-swapped doorway page proposal outside confirmed service areas successfully blocked.');

  console.log('--- PROMPT 039 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
