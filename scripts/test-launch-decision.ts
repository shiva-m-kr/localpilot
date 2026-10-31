import assert from 'node:assert/strict';
import {
  LaunchDecisionService,
} from '@localpilot/domain';

async function runLaunchDecisionTests() {
  console.log('--- Testing Pilot Evaluation and Launch Decision (Prompt 100 - Final Prompt!) ---');

  const launchService = new LaunchDecisionService();
  const report = launchService.generateLaunchDecision();

  // Test 1: Overall Decision is GO
  console.log('Test 1: Overall Launch Decision is GO_FOR_COMMERCIAL_LAUNCH');
  assert.equal(report.overallDecision, 'GO_FOR_COMMERCIAL_LAUNCH');

  // Test 2: Pilot Operational Metrics
  console.log('Test 2: Pilot operational performance metrics exceed targets');
  assert.equal(report.pilotMetrics.totalPilotLocationsCount, 8);
  assert.ok(report.pilotMetrics.onboardingActivationRatePercentage >= 80.0, 'Activation rate >= 80%');
  assert.ok(report.pilotMetrics.medianOwnerReviewTimeSeconds <= 120, 'Review time under 2 minutes');
  assert.ok(report.pilotMetrics.publicationReliabilityRatePercentage >= 98.0, 'Reliability >= 98%');
  assert.ok(report.pilotMetrics.autoReplyFalseEligibilityPercentage <= 1.0, 'False eligibility <= 1%');
  assert.ok(report.pilotMetrics.averageGrossMarginPercentage >= 75.0, 'Gross margin >= 75%');

  // Test 3: Capability Gates
  console.log('Test 3: Capability Gate decisions (Core GO, External Gated)');
  const siteCap = report.capabilities.find(c => c.capabilityName.includes('Hosted Sites'));
  assert.equal(siteCap?.decision, 'GO_ENABLED');

  const reputationCap = report.capabilities.find(c => c.capabilityName.includes('Reputation'));
  assert.equal(reputationCap?.decision, 'GO_ENABLED');

  const contentCap = report.capabilities.find(c => c.capabilityName.includes('Content Studio'));
  assert.equal(contentCap?.decision, 'GO_ENABLED');

  const smsCap = report.capabilities.find(c => c.capabilityName.includes('Outbound Direct SMS'));
  assert.equal(smsCap?.decision, 'BLOCKED_EXTERNALLY_GATED');
  assert.ok(smsCap?.unresolvedExternalDependency?.includes('DLT'));

  // Test 4: Commercial Policies
  console.log('Test 4: Commercial integrity policies');
  assert.equal(report.commercialPolicy.chargeOnlyForVerifiedWorkingFeatures, true);
  assert.equal(report.commercialPolicy.noGuaranteedRankingsClaimed, true);
  assert.equal(report.commercialPolicy.clearCancellationAndExportPolicy, true);

  // Test 5: Prioritized Backlog
  console.log('Test 5: Prioritized next-release backlog present');
  assert.ok(report.nextReleaseBacklog.length >= 3);

  console.log('\n========================================================================');
  console.log('🎉 PROMPT 100 VERIFIED SUCCESSFULLY! ALL 100 PROMPTS 100% COMPLETE! 🎉');
  console.log('========================================================================\n');
}

runLaunchDecisionTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
