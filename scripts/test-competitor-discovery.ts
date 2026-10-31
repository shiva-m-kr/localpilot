import { randomUUID } from 'crypto';
import assert from 'assert';
import { CompetitorDiscoveryService } from '../packages/domain/src/competitorDiscoveryService.js';

async function runTest() {
  console.log('Testing Prompt 058: Discover service- and geography-specific competitors...');

  CompetitorDiscoveryService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();

  // Initialize competitor set for Austin area
  CompetitorDiscoveryService.getOrCreateSet({
    organizationId: orgId,
    locationId: locId,
    latitude: 30.2672,
    longitude: -97.7431,
    radiusKm: 15.0
  });

  // 1. Ingest SERP candidates: includes local competitors and directories
  CompetitorDiscoveryService.ingestSerpObservations({
    locationId: locId,
    candidates: [
      { businessName: 'Yelp - Top 10 Roofers Austin', domain: 'yelp.com' },
      { businessName: 'Angi Austin Roofing Pros', domain: 'angi.com' },
      { businessName: 'Lone Star Roofing Austin', placeId: 'ChIJ_lonestar_1', domain: 'lonestarroofing.example.com' },
      { businessName: 'Austin Quality Roofing', placeId: 'ChIJ_austinquality_2', domain: 'austinqualityroof.example.com' },
      // Similar name entity check:
      { businessName: 'Lone Star Commercial Roofers', placeId: 'ChIJ_lonestar_comm_3', domain: 'lonestarcommercial.example.com' }
    ]
  });

  // 2. Directory Classification Guard
  const activeLocal = CompetitorDiscoveryService.getActiveLocalCompetitors(locId);
  const yelpFound = activeLocal.some((c) => c.domain === 'yelp.com');
  const angiFound = activeLocal.some((c) => c.domain === 'angi.com');
  assert.strictEqual(yelpFound, false, 'Yelp must NOT be classified as local service competitor');
  assert.strictEqual(angiFound, false, 'Angi must NOT be classified as local service competitor');
  console.log('✓ Directories and aggregators (Yelp, Angi) filtered out from local service competitors');

  // 3. Similar Name Disambiguation Guard: Lone Star Roofing vs Lone Star Commercial Roofers
  const loneStarMatches = activeLocal.filter((c) => c.businessName.includes('Lone Star'));
  assert.strictEqual(loneStarMatches.length, 2, 'Distinct Place IDs must remain 2 separate competitor entities');
  assert.notStrictEqual(loneStarMatches[0].id, loneStarMatches[1].id);
  console.log('✓ Similar names with distinct Place IDs not auto-merged (strict entity boundary)');

  // 4. Owner-Supplied Competitor
  const ownerComp = CompetitorDiscoveryService.addOwnerSuppliedCompetitor({
    locationId: locId,
    businessName: 'Patriot Roofing Solutions',
    domain: 'patriotroofing.example.com'
  });

  assert.strictEqual(ownerComp.sourceType, 'OWNER_SUPPLIED');
  assert.strictEqual(ownerComp.isConfirmedByOwner, true);
  console.log('✓ Owner-supplied competitor added with confirmed status');

  // 5. Competitor Exclusion
  const countBeforeExclude = CompetitorDiscoveryService.getActiveLocalCompetitors(locId).length;
  CompetitorDiscoveryService.excludeCompetitor(locId, ownerComp.id);
  const countAfterExclude = CompetitorDiscoveryService.getActiveLocalCompetitors(locId).length;
  assert.strictEqual(countAfterExclude, countBeforeExclude - 1);
  console.log('✓ Owner exclusion successfully removes target entity from active competitor list');

  console.log('Prompt 058 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
