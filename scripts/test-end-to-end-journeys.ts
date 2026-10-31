import assert from 'node:assert/strict';
import {
  EndToEndJourneysService,
} from '@localpilot/domain';

async function runEndToEndJourneysTests() {
  console.log('--- Testing Complete End-to-End Journeys and Realistic Workloads (Prompt 098) ---');

  const journeyService = new EndToEndJourneysService();
  const report = await journeyService.executeEndToEndJourneys();

  console.log(`Executed ${report.totalJourneysTested} major integration journey pillars.`);
  console.log(`Passed: ${report.passedJourneysCount}, Failed: ${report.failedJourneysCount}`);

  for (const step of report.steps) {
    console.log(`  [${step.status}] Pillar ${step.stepNumber}: ${step.name} (${step.durationMs}ms)`);
    assert.equal(step.status, 'PASSED');
  }

  assert.equal(report.failedJourneysCount, 0);
  assert.equal(report.isSystemReadyForPilot, true);
  assert.equal(report.viewportsValidated.length, 4);
  assert.ok(report.stressScenariosTested.length >= 4);

  console.log('Prompt 098 verified successfully!\n');
}

runEndToEndJourneysTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
