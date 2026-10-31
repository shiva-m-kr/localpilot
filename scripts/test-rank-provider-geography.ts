import assert from 'assert';
import { RankProviderAdapter } from '../packages/integrations/src/rankings/rankProviderAdapter.js';
import { RankQueryRequest } from '../packages/contracts/src/rankProvider.js';

async function runTest() {
  console.log('Testing Prompt 051: Validate ranking-provider geography and identity...');

  const adapter = new RankProviderAdapter();

  // 1. Invalid coordinates validation
  const invalidGeoResult = await adapter.executeRankSpike({
    query: 'roof inspection',
    latitude: 145.0, // Invalid latitude (> 90)
    longitude: -97.7431,
    surface: 'GOOGLE_MAPS',
    device: 'MOBILE',
    language: 'en',
    depth: 20,
    target: { businessName: 'Apex Roofing' }
  });

  assert.strictEqual(invalidGeoResult.rank, null);
  assert(invalidGeoResult.taskError?.includes('Invalid coordinates'));
  console.log('✓ Invalid geography coordinates caught and rejected with task error');

  // 2. Ambiguous match detection (multiple branches match common name)
  const ambiguousResult = await adapter.executeRankSpike({
    query: 'roof repair austin',
    latitude: 30.2672,
    longitude: -97.7431,
    surface: 'GOOGLE_MAPS',
    device: 'MOBILE',
    language: 'en',
    depth: 20,
    target: { businessName: 'Apex Roofing' } // No Place ID or CID provided!
  });

  assert.strictEqual(ambiguousResult.rank, null, 'Ambiguous name match must NOT guess a rank');
  assert.strictEqual(ambiguousResult.isAmbiguousMatch, true);
  assert.strictEqual(ambiguousResult.confirmationRequired, true);
  assert(ambiguousResult.taskError?.includes('Ambiguous match'));
  console.log('✓ Ambiguous name match flagged for owner confirmation instead of assigning a false rank');

  // 3. Exact target match using stable Place ID
  const exactResult = await adapter.executeRankSpike({
    query: 'roof repair austin',
    latitude: 30.2672,
    longitude: -97.7431,
    surface: 'GOOGLE_MAPS',
    device: 'MOBILE',
    language: 'en',
    depth: 20,
    target: {
      businessName: 'Apex Roofing',
      placeId: 'ChIJ_apex_north_99' // Exact Place ID!
    }
  });

  assert.strictEqual(exactResult.rank, 2);
  assert.strictEqual(exactResult.found, true);
  assert.strictEqual(exactResult.placeIdObserved, 'ChIJ_apex_north_99');
  assert.strictEqual(exactResult.actualCostMicros, 2000, 'Actual provider cost recorded in micros');
  console.log(`✓ Stable Place ID matched exact location (Rank #${exactResult.rank}, Cost: ${exactResult.actualCostMicros}µs)`);

  // 4. Surface Isolation Principle: Maps vs Organic
  assert.strictEqual(exactResult.surface, 'GOOGLE_MAPS');
  const organicResult = await adapter.executeRankSpike({
    query: 'roof repair austin',
    latitude: 30.2672,
    longitude: -97.7431,
    surface: 'ORGANIC_SERP',
    device: 'DESKTOP',
    language: 'en',
    depth: 50,
    target: { businessName: 'Apex Roofing', placeId: 'ChIJ_apex_north_99' }
  });

  assert.strictEqual(organicResult.surface, 'ORGANIC_SERP');
  assert.notStrictEqual(organicResult.actualCostMicros, exactResult.actualCostMicros);
  console.log('✓ Result surface isolation enforced (Google Maps distinguished from Organic SERP)');

  console.log('Prompt 051 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
