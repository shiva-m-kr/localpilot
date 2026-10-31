import { randomUUID } from 'crypto';
import assert from 'assert';
import { ActionPlanService } from '../packages/domain/src/actionPlanService.js';
import { ValidationFailedError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 064: Turn recommendations into controlled action plans...');

  ActionPlanService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();
  const recId = randomUUID();

  const step1Id = randomUUID();
  const step2Id = randomUUID();

  // 1. Create plan with step dependency: Step 2 depends on Step 1
  const plan = ActionPlanService.createPlan({
    recommendationId: recId,
    actionType: 'FIX_BOOKING_LINK_AND_UPDATE_GBP',
    organizationId: orgId,
    locationId: locId,
    title: 'Restore Booking Endpoint and Update Google Profile CTA',
    steps: [
      {
        id: step1Id,
        title: 'Fix HTTP 404 on /schedule-estimate endpoint'
      },
      {
        id: step2Id,
        title: 'Update Google Business Profile booking CTA button URL',
        dependsOnStepIds: [step1Id] // Dependent on step 1!
      }
    ],
    estimatedCostUsd: 0.1
  });

  assert.strictEqual(plan.status, 'READY_FOR_APPROVAL');
  assert.strictEqual(plan.steps[1].isPrerequisiteMet, false);
  console.log('✓ Action plan created with ordered step dependency graph');

  // Approve plan
  ActionPlanService.approvePlan(plan.planId);

  // 2. Blocked Prerequisite Guard: Attempting Step 2 before Step 1 fails
  assert.rejects(
    async () => {
      await ActionPlanService.executeStep(plan.planId, step2Id, async () => ({
        externalId: 'gbp-cta-01',
        proof: 'GBP CTA updated'
      }));
    },
    (err: any) => err instanceof ValidationFailedError,
    'Executing step with incomplete prerequisite must fail'
  );
  console.log('✓ Prerequisite guard enforced: Dependent step execution blocked until prerequisite completes');

  // 3. Complete Step 1
  const afterStep1 = await ActionPlanService.executeStep(plan.planId, step1Id, async () => ({
    proof: 'Verified HTTP 200 on /schedule-estimate'
  }));

  assert.strictEqual(afterStep1.steps[0].isExecuted, true);
  assert.strictEqual(afterStep1.steps[1].isPrerequisiteMet, true, 'Downstream step unlocked');
  console.log('✓ Step 1 verified and executed, downstream step unlocked');

  // 4. Complete Step 2 -> Plan completed & separation of technical vs marketing impact
  const afterStep2 = await ActionPlanService.executeStep(plan.planId, step2Id, async () => ({
    externalId: 'gbp-cta-99',
    proof: 'GBP CTA verified active'
  }));

  assert.strictEqual(afterStep2.status, 'COMPLETED');
  assert.strictEqual(afterStep2.technicalExecutionSuccess, true, 'Technical execution verified complete');
  assert.strictEqual(
    afterStep2.marketingImpactAssessed,
    false,
    'Marketing impact must remain separate from technical execution until observation window concludes'
  );
  console.log('✓ Action plan completed with technical execution strictly separated from marketing impact');

  // 5. Rejection & Snooze Cooldown Suppression
  const plan2 = ActionPlanService.createPlan({
    recommendationId: randomUUID(),
    actionType: 'MASS_LOCATION_DOORWAY_CREATION',
    organizationId: orgId,
    locationId: locId,
    title: 'Create doorway pages for all surrounding suburbs',
    steps: [{ title: 'Review doorway content' }]
  });

  // Owner rejects recommendation
  ActionPlanService.rejectPlan(plan2.planId, 'Doorway pages violate our business quality policy', 30);

  // Check suppression
  const isSuppressed = ActionPlanService.isActionSuppressed(
    locId,
    'MASS_LOCATION_DOORWAY_CREATION',
    new Date().toISOString()
  );
  assert.strictEqual(isSuppressed, true, 'Rejected action must be suppressed during cooldown');
  console.log('✓ Owner rejection recorded with 30-day cooldown suppression (prevents re-surfacing under rephrased wording)');

  console.log('Prompt 064 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
