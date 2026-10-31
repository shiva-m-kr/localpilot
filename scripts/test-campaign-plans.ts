import assert from 'assert';
import crypto from 'crypto';
import { CampaignPlanService } from '@localpilot/domain';
import { IntentCluster } from '@localpilot/contracts';

async function runTest() {
  console.log('--- RUNNING PROMPT 040: REVIEWABLE CAMPAIGN BRIEFS & MONTHLY PLANS VERIFICATION ---');

  CampaignPlanService.clear();

  const tenantId = crypto.randomUUID();

  const mockClusters: IntentCluster[] = [
    {
      id: crypto.randomUUID(),
      clusterName: 'Drain Cleaning - North York',
      service: 'Drain Cleaning',
      targetLocality: 'North York',
      mappedKeywords: ['drain cleaning north york', 'emergency drain service'],
      primaryIntent: 'TRANSACTIONAL',
      recommendedCanonicalUrl: 'https://apexplumbing.example.com/drain-cleaning',
      isExistingPage: true,
      actionType: 'IMPROVE_EXISTING_CANONICAL',
      cannibalizationRisk: 'NONE',
      doorwayRisk: false
    },
    {
      id: crypto.randomUUID(),
      clusterName: 'Water Heater Installation - Toronto',
      service: 'Water Heater Installation',
      targetLocality: 'Toronto',
      mappedKeywords: ['water heater install toronto'],
      primaryIntent: 'COMMERCIAL',
      recommendedCanonicalUrl: 'https://apexplumbing.example.com/services/water-heater',
      isExistingPage: false,
      actionType: 'CREATE_NEW_PAGE',
      cannibalizationRisk: 'NONE',
      doorwayRisk: false
    }
  ];

  const confirmedFacts = {
    businessName: { value: 'Apex Plumbing', confirmedAt: new Date().toISOString() }
  };

  // 1. Generate bounded plan fitting within 10 credit allowance
  const plan = CampaignPlanService.generatePlan({
    organizationId: tenantId,
    month: '2026-11',
    clusters: mockClusters,
    confirmedFacts,
    maxCreditBudget: 10
  });

  assert.strictEqual(plan.month, '2026-11');
  assert.strictEqual(plan.items.length, 2);
  assert.strictEqual(plan.totalEstimatedCredits, 4); // 2 credits per item
  assert.ok(plan.totalEstimatedCredits <= 10);
  assert.strictEqual(plan.isOwnerApproved, false);
  console.log('✓ Generated 30-day bounded plan fitting within quota without forced daily filler.');

  // 2. Truth-in-content & Prerequisites Acceptance:
  // Each item explains why it was selected (businessGoal, sourceFacts) and prerequisites
  const item1 = plan.items[0];
  assert.ok(item1.businessGoal.includes('Drain Cleaning in North York'));
  assert.ok(item1.sourceFacts.length > 0);
  assert.ok(item1.neededOwnerEvidence?.includes('Upload 1 verified photo'));
  assert.ok(item1.prerequisites.includes('Owner photo evidence required before publishing'));
  assert.strictEqual(item1.status, 'PROPOSED');
  console.log('✓ Campaign item articulates customer business goal, source facts, and explicit blocking prerequisites.');

  // 3. Owner Actions: Edit and Approve individual item
  const editedItem = CampaignPlanService.editPlanItem(plan.id, item1.id, {
    title: 'Custom Title: Emergency Freeze Defense Guide'
  });
  assert.strictEqual(editedItem.status, 'EDITED');
  assert.strictEqual(editedItem.title, 'Custom Title: Emergency Freeze Defense Guide');

  const approvedItem = CampaignPlanService.approvePlanItem(plan.id, item1.id);
  assert.strictEqual(approvedItem.status, 'APPROVED');
  console.log('✓ Owner edit and individual item approval verified.');

  // 4. Owner Action: Remove item updates estimated credits
  const item2 = plan.items[1];
  CampaignPlanService.removePlanItem(plan.id, item2.id);
  const updatedPlan = CampaignPlanService.getPlan(plan.id);
  assert.strictEqual(updatedPlan?.totalEstimatedCredits, 2); // 4 - 2 = 2
  console.log('✓ Owner remove item dynamically updates plan credit budget.');

  // 5. Approve entire plan
  CampaignPlanService.approveEntirePlan(plan.id);
  const finalPlan = CampaignPlanService.getPlan(plan.id);
  assert.strictEqual(finalPlan?.isOwnerApproved, true);
  console.log('✓ Explicit owner whole-plan approval verified.');

  console.log('--- PROMPT 040 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
