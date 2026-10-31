import { randomUUID } from 'crypto';
import assert from 'assert';
import { CompetitorProfileService } from '../packages/domain/src/competitorProfileService.js';

async function runTest() {
  console.log('Testing Prompt 059: Build comparable competitor evidence profiles...');

  CompetitorProfileService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();
  const compId = randomUUID();

  // 1. Build Competitor Evidence Profile
  const profile = CompetitorProfileService.buildEvidenceProfile({
    competitorId: compId,
    organizationId: orgId,
    locationId: locId,
    businessName: 'Austin Star Roofing Co',
    primaryCategory: 'Roofing Contractor',
    observedServices: ['Emergency Roof Repair', 'Hail Damage Tarping', 'Shingle Replacement'],
    observedRating: 4.8,
    sampleReviewCount: 15, // Only 15 reviews observed in sample
    totalEstimatedReviews: 120, // Estimated 120 total on Google
    top3Appearances: 18,
    totalSampledGridPoints: 25,
    geographicScopeLabel: 'North Austin 10km grid'
  });

  // 2. Truth-in-Metrics Review Labeling: Sampled vs Total
  assert.strictEqual(profile.ratingEvidence.isSampledOnly, true, 'Sampled reviews must be explicitly marked as sampled');
  assert.strictEqual(profile.ratingEvidence.sampleReviewCount, 15);
  assert.strictEqual(profile.ratingEvidence.totalEstimatedReviewCount, 120);
  console.log('✓ Sampled reviews (15 of 120) strictly labeled as sample (not represented as full corpus)');

  // 3. Truth-in-Metrics: No invented backlinks or volume data
  assert.strictEqual(profile.backlinkMetric.isUnavailable, true);
  assert.strictEqual(profile.backlinkMetric.count, null, 'Missing backlinks must remain null (never invented)');
  assert(profile.backlinkMetric.explanation.includes('Values are not invented'));

  assert.strictEqual(profile.keywordVolumeMetric.isUnavailable, true);
  assert.strictEqual(profile.keywordVolumeMetric.volume, null, 'Missing keyword volume must remain null');
  console.log('✓ Missing backlink and keyword volume metrics accurately labeled UNAVAILABLE without fabricated data');

  // 4. Overlap Metric Definition (Never falsely called "Total Market Share")
  assert.strictEqual(profile.serpOverlap.top3AppearanceCount, 18);
  assert.strictEqual(profile.serpOverlap.totalSampledPoints, 25);
  assert.strictEqual(profile.serpOverlap.overlapRatePercent, 72.0);
  assert(
    profile.serpOverlap.definitionText.includes('local query overlap on Google Maps, not total commercial market share'),
    'Overlap definition must state it is local query overlap, not total market share'
  );
  console.log('✓ SERP overlap (72.0%) clearly labeled with explicit measurement definition');

  // 5. Expiration & Retention
  const expiryTime = new Date(profile.profileExpiresAt).getTime();
  const observedTime = new Date(profile.profileObservedAt).getTime();
  const diffDays = Math.round((expiryTime - observedTime) / (1000 * 60 * 60 * 24));
  assert.strictEqual(diffDays, 30, 'Profile evidence retention must be 30 days');
  console.log('✓ 30-day retention and evidence expiration policy enforced');

  console.log('Prompt 059 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
