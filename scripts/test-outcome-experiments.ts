import { OutcomeExperimentService } from '../packages/domain/src/outcomeExperimentService.js';
import { OutcomeExperiment } from '../packages/contracts/src/outcomeExperiments.js';

console.log('--- Testing Prompt 065: Conservative Outcome Measurement & Experiments ---');

OutcomeExperimentService.reset();

// 1. Create an experiment with baseline and intervention date
const baselineStart = '2026-09-01T00:00:00Z';
const baselineEnd = '2026-09-28T00:00:00Z';
const interventionDate = '2026-09-29T00:00:00Z';

const experiment = OutcomeExperimentService.createExperiment({
  organizationId: 'org_123',
  locationId: 'loc_plumbing_main',
  actionPlanId: 'plan_canonical_enhancement',
  hypothesis: 'Enhancing the canonical emergency plumbing service page will correlate with improved qualified inquiries.',
  interventionDate,
  baselineValue: 14,
  baselineStartDate: baselineStart,
  baselineEndDate: baselineEnd,
  confounders: [
    {
      type: 'SEASONALITY',
      description: 'First autumn cold snap historically increases pipe freeze inquiries.'
    }
  ]
});

console.log('✓ Experiment created:', experiment.id);
if (!experiment.causationDisclaimer.includes('without asserting proven direct causation')) {
  throw new Error('Missing strict causation disclaimer');
}
console.log('✓ Causation disclaimer verified:', experiment.causationDisclaimer);

// 2. Verify cooldown / premature modification guard
const isPrematureDay5 = OutcomeExperimentService.isPrematureToModify(
  'loc_plumbing_main',
  '2026-10-04T00:00:00Z'
);
if (!isPrematureDay5) {
  throw new Error('Expected modification to be flagged premature during observation window');
}
console.log('✓ Cooldown / Premature modification guard correctly blocked rewriting during observation period');

// 3. Attempting to conclude prematurely must throw ValidationFailedError
let prematureBlocked = false;
try {
  OutcomeExperimentService.evaluateConclusion({
    experimentId: experiment.id,
    observedValue: 22,
    asOfDateIso: '2026-10-10T00:00:00Z'
  });
} catch (e: any) {
  prematureBlocked = true;
  console.log('✓ Premature conclusion successfully prevented:', e.message);
}
if (!prematureBlocked) {
  throw new Error('Premature conclusion was not prevented');
}

// 4. Conclude with active confounders -> Must be CONCLUDED_INCONCLUSIVE, never "proven lift"
const postObservationDate = '2026-10-30T00:00:00Z';
const concludedInconclusive = OutcomeExperimentService.evaluateConclusion({
  experimentId: experiment.id,
  observedValue: 25,
  asOfDateIso: postObservationDate,
  additionalConfounders: [
    {
      type: 'SIMULTANEOUS_EDIT',
      description: 'GBP holiday hours were simultaneously modified.'
    }
  ]
});

if (concludedInconclusive.status !== 'CONCLUDED_INCONCLUSIVE') {
  throw new Error(`Expected CONCLUDED_INCONCLUSIVE due to confounders, got ${concludedInconclusive.status}`);
}
if (!concludedInconclusive.conclusionNotes?.includes('Inconclusive outcome')) {
  throw new Error('Conclusion notes failed to clearly identify inconclusive outcome');
}
console.log('✓ Confounders prevented false "proven lift" claim:', concludedInconclusive.status);

// 5. Test clean observation with no confounders and sufficient sample size
const cleanExperiment = OutcomeExperimentService.createExperiment({
  organizationId: 'org_123',
  locationId: 'loc_clean_test',
  actionPlanId: 'plan_schema_markup',
  hypothesis: 'Adding local business schema will correlate with search appearance.',
  interventionDate: '2026-09-01T00:00:00Z',
  baselineValue: 15,
  baselineStartDate: '2026-08-01T00:00:00Z',
  baselineEndDate: '2026-08-28T00:00:00Z'
});

const cleanConclusion = OutcomeExperimentService.evaluateConclusion({
  experimentId: cleanExperiment.id,
  observedValue: 24,
  asOfDateIso: '2026-10-05T00:00:00Z'
});

if (cleanConclusion.status !== 'CONCLUDED_CORRELATED_LIFT') {
  throw new Error(`Expected CONCLUDED_CORRELATED_LIFT, got ${cleanConclusion.status}`);
}
if (!cleanConclusion.conclusionNotes?.includes('without claiming proven causal attribution')) {
  throw new Error('Should explicitly state that it does not claim proven causal attribution');
}
console.log('✓ Correlated lift accurately recorded without claiming proven causation:', cleanConclusion.status);

console.log('✓ All Prompt 065 tests passed successfully!');
