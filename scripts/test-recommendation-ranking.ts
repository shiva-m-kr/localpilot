import { randomUUID } from 'crypto';
import assert from 'assert';
import { RecommendationRankingService } from '../packages/domain/src/recommendationRankingService.js';
import { HeuristicFactors } from '../packages/contracts/src/recommendationScoring.js';

async function runTest() {
  console.log('Testing Prompt 063: Rank recommendations with explainable priorities...');

  const orgId = randomUUID();
  const locId = randomUUID();

  const factors1: HeuristicFactors = {
    confidence: 0.95,
    impact: 5,
    relevance: 5,
    gapMagnitude: 4,
    urgency: 4,
    effort: 1, // Quick fix!
    costEstimateUsd: 0.0
  };

  // 1. Transparent Heuristic Priority Scoring
  const { score, reasonBreakdown } = RecommendationRankingService.computePriorityScore(factors1);
  assert(score >= 50 && score <= 100, `Score must be high for high impact & low effort (got ${score})`);
  assert(reasonBreakdown.confidence.includes('95% verified'));
  assert.strictEqual(
    reasonBreakdown.metricLabel,
    'Internal Priority Score (not probability of ranking success)'
  );
  console.log(`✓ Heuristic priority score calculated (${score}/100) with factor reason breakdown`);

  // 2. Hard Gate Checks
  // A. Revoked Consent
  const gateRevokedConsent = RecommendationRankingService.evaluateHardGates({
    hasConsent: false, // Revoked!
    isCapabilitySupported: true,
    isEvidenceValidAndActive: true,
    isUnderCooldown: false
  });
  assert.strictEqual(gateRevokedConsent.passedAllGates, false);
  assert(gateRevokedConsent.gateFailureReason?.includes('publishing consent is revoked'));
  console.log('✓ Hard gate: Revoked consent blocks recommendation from weekly queue');

  // B. Expired Evidence
  const gateExpiredEvidence = RecommendationRankingService.evaluateHardGates({
    hasConsent: true,
    isCapabilitySupported: true,
    isEvidenceValidAndActive: false, // Expired!
    isUnderCooldown: false
  });
  assert.strictEqual(gateExpiredEvidence.passedAllGates, false);
  assert(gateExpiredEvidence.gateFailureReason?.includes('evidence is expired or purged'));
  console.log('✓ Hard gate: Expired evidence blocks recommendation until fresh data is gathered');

  // C. Passed Gates
  const gatePassed = RecommendationRankingService.evaluateHardGates({
    hasConsent: true,
    isCapabilitySupported: true,
    isEvidenceValidAndActive: true,
    isUnderCooldown: false
  });
  assert.strictEqual(gatePassed.passedAllGates, true);

  // 3. Weekly Shortlist Generation & De-duplication
  const candidates = [
    {
      organizationId: orgId,
      locationId: locId,
      title: 'Fix broken booking destination URL',
      targetAction: 'FIX_BOOKING_LINK',
      factors: factors1,
      hardGates: gatePassed
    },
    {
      organizationId: orgId,
      locationId: locId,
      title: 'Duplicate booking URL fix advisory',
      targetAction: 'FIX_BOOKING_LINK', // Duplicate target action!
      factors: { ...factors1, effort: 2 },
      hardGates: gatePassed
    },
    {
      organizationId: orgId,
      locationId: locId,
      title: 'Synchronize Saturday operating hours',
      targetAction: 'UPDATE_GBP_HOURS',
      factors: { ...factors1, impact: 3, effort: 2 },
      hardGates: gatePassed
    },
    {
      organizationId: orgId,
      locationId: locId,
      title: 'Publish blog without WordPress connection',
      targetAction: 'PUBLISH_BLOG',
      factors: factors1,
      hardGates: gateRevokedConsent // Fails gate!
    }
  ];

  const shortlist = RecommendationRankingService.buildWeeklyShortlist(candidates, 3);
  assert.strictEqual(shortlist.length, 2, 'Should filter out hard gate failure and deduplicate FIX_BOOKING_LINK');
  assert.strictEqual(shortlist[0].targetAction, 'FIX_BOOKING_LINK');
  assert.strictEqual(shortlist[1].targetAction, 'UPDATE_GBP_HOURS');
  assert.strictEqual(shortlist[0].requiresOwnerApproval, true, 'High score must still require owner approval');
  console.log(`✓ Weekly shortlist produced ${shortlist.length} deduplicated actionable tasks with mandatory approval requirement`);

  console.log('Prompt 063 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
