import { randomUUID } from 'crypto';
import assert from 'assert';
import { CompetitorGapService } from '../packages/domain/src/competitorGapService.js';
import { CompetitorEvidenceProfile } from '../packages/contracts/src/competitorProfiles.js';

async function runTest() {
  console.log('Testing Prompt 060: Identify useful competitor content and journey gaps...');

  const orgId = randomUUID();
  const locId = randomUUID();

  // Owner confirmed offerings:
  const ownerConfirmedServices = [
    'Emergency Roof Repair',
    'Hail Damage Tarping'
    // Note: Owner does NOT do "Chimney Sweeping"
  ];

  // Owner existing canonical pages:
  const ownerCanonicalPages = [
    {
      serviceKey: 'emergency-roof-repair',
      url: 'https://apexroofing.example.com/services/emergency-roof-repair',
      title: 'Emergency Roof Repair Austin'
    }
    // Hail Damage Tarping does NOT have a page yet
  ];

  // Competitor observed profile:
  const competitorProfile: CompetitorEvidenceProfile = {
    profileId: randomUUID(),
    competitorId: randomUUID(),
    organizationId: orgId,
    locationId: locId,
    businessName: 'Austin Pro Roofing',
    primaryCategory: 'Roofing Contractor',
    observedServices: [
      'Emergency Roof Repair',
      'Hail Damage Tarping',
      'Chimney Sweeping' // Unconfirmed by owner!
    ],
    ratingEvidence: {
      rating: 4.7,
      isSampledOnly: false,
      source: 'LICENSED_SERP_OBSERVATION'
    },
    backlinkMetric: { count: null, isUnavailable: true, source: 'UNAVAILABLE', explanation: 'N/A' },
    keywordVolumeMetric: { volume: null, isUnavailable: true, source: 'UNAVAILABLE', explanation: 'N/A' },
    serpOverlap: { top3AppearanceCount: 15, totalSampledPoints: 25, overlapRatePercent: 60, definitionText: 'Overlap' },
    profileObservedAt: new Date().toISOString(),
    profileExpiresAt: new Date().toISOString()
  };

  const recommendations = CompetitorGapService.analyzeGaps({
    organizationId: orgId,
    locationId: locId,
    ownerConfirmedServices,
    ownerCanonicalPages,
    competitorProfiles: [competitorProfile]
  });

  // 1. Unconfirmed service is NOT recommended
  const chimneyRec = recommendations.find((r) => r.serviceKey.includes('chimney'));
  assert.strictEqual(chimneyRec, undefined, 'Unconfirmed service (Chimney Sweeping) must not be recommended');
  console.log('✓ Unconfirmed services filtered out (only confirmed business offerings analyzed)');

  // 2. Existing Canonical Page is prioritized for enhancement over creating doorway pages
  const emergencyRepairRec = recommendations.find((r) => r.serviceKey === 'emergency-roof-repair');
  assert(emergencyRepairRec);
  assert.strictEqual(emergencyRepairRec.actionTarget, 'ENHANCE_EXISTING_CANONICAL');
  assert.strictEqual(emergencyRepairRec.existingCanonicalUrl, 'https://apexroofing.example.com/services/emergency-roof-repair');
  assert(!emergencyRepairRec.recommendationTitle.toLowerCase().includes('austin tx round rock'));
  console.log('✓ Favored enhancing existing canonical page over creating duplicate locality doorway pages');

  // 3. Missing Confirmed Service Page generates clean new page recommendation
  const hailTarpingRec = recommendations.find((r) => r.serviceKey === 'hail-damage-tarping');
  assert(hailTarpingRec);
  assert.strictEqual(hailTarpingRec.actionTarget, 'CREATE_NEW_SERVICE_PAGE');
  console.log('✓ Missing confirmed service page correctly flagged with CREATE_NEW_SERVICE_PAGE action');

  // 4. Truth in SEO: Prohibited claims avoided & Customer Benefit provided
  assert.strictEqual(emergencyRepairRec.avoidsWordCountCorrelationClaim, true);
  assert.strictEqual(emergencyRepairRec.avoidsPlagiarizedCopy, true);
  assert(emergencyRepairRec.practicalCustomerBenefit.includes('helps customers evaluate service quality'));
  console.log('✓ Truth-in-SEO verified: no claims that word count caused rank; original copy enforced');

  console.log('Prompt 060 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
