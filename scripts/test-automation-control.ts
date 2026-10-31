import { randomUUID } from 'crypto';
import assert from 'assert';
import {
  AutomationControlService,
  ScheduledJobDescriptor
} from '../packages/domain/src/automationControlService.js';

async function runTest() {
  console.log('Testing Prompt 050: Build the automation control center...');

  AutomationControlService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();

  // 1. Initial review-first policy
  const policy = AutomationControlService.getOrCreatePolicy(orgId, locId);
  assert.strictEqual(policy.autoPublishRequiresApproval, true, 'Default policy must be review-first');
  assert.strictEqual(policy.globalKillSwitchEngaged, false);
  assert.strictEqual(policy.activeKillSwitches.length, 0);
  console.log('✓ Review-first automation policy created with strict default approval guards');

  // 2. Normal dispatch evaluation
  const unapprovedCheck = AutomationControlService.isDispatchPermitted(locId, 'WORDPRESS', false);
  assert.strictEqual(unapprovedCheck.permitted, false);
  assert(unapprovedCheck.reason?.includes('mandates owner approval'));

  const approvedCheck = AutomationControlService.isDispatchPermitted(locId, 'WORDPRESS', true);
  assert.strictEqual(approvedCheck.permitted, true);
  console.log('✓ Dispatch permission correctly enforces owner approval requirement');

  // 3. Selective Channel Kill Switch
  AutomationControlService.engageKillSwitch(locId, 'WORDPRESS');
  const wpCheck = AutomationControlService.isDispatchPermitted(locId, 'WORDPRESS', true);
  assert.strictEqual(wpCheck.permitted, false, 'WordPress dispatch must be halted when its switch is engaged');
  assert(wpCheck.reason?.includes('Channel kill switch is engaged for WORDPRESS'));

  // Other channels remain permitted
  const gbpCheck = AutomationControlService.isDispatchPermitted(locId, 'GBP', true);
  assert.strictEqual(gbpCheck.permitted, true, 'Other channels must continue running');
  console.log('✓ Selective channel kill switch halted target channel without affecting others');

  // 4. Global Kill Switch halts everything
  AutomationControlService.engageKillSwitch(locId, 'GLOBAL_ALL');
  const globalCheck1 = AutomationControlService.isDispatchPermitted(locId, 'GBP', true);
  assert.strictEqual(globalCheck1.permitted, false);
  assert(globalCheck1.reason?.includes('Global automation kill switch'));

  const globalCheck2 = AutomationControlService.isDispatchPermitted(locId, 'META_FACEBOOK', true);
  assert.strictEqual(globalCheck2.permitted, false);
  console.log('✓ Global kill switch immediately halts queued dispatch across all channels');

  // Disengage global switch
  AutomationControlService.disengageKillSwitch(locId, 'GLOBAL_ALL');

  // 5. Impact preview
  const scheduledJobs: ScheduledJobDescriptor[] = [
    { id: randomUUID(), locationId: locId, channel: 'GBP', scheduledAt: '2026-11-01T10:00:00Z', estimatedCostUsd: 0.15 },
    { id: randomUUID(), locationId: locId, channel: 'GBP', scheduledAt: '2026-11-02T10:00:00Z', estimatedCostUsd: 0.15 },
    { id: randomUUID(), locationId: locId, channel: 'WORDPRESS', scheduledAt: '2026-11-03T10:00:00Z', estimatedCostUsd: 0.05 }
  ];

  const preview = AutomationControlService.previewImpact(policy, 'GBP', scheduledJobs);
  assert.strictEqual(preview.affectedScheduledJobIds.length, 2);
  assert.strictEqual(preview.upcomingSavingsUsd, 0.30);
  assert(preview.summary.includes('immediately blocks 2 scheduled dispatches'));
  console.log('✓ Impact preview accurately projects affected jobs and budget savings');

  // 6. Plan upgrade safety: Upgrading plan does NOT broaden consent or toggle approval
  const upgradedPolicy = AutomationControlService.upgradePlan(locId, {
    dailySpendCapUsd: 50.0,
    monthlySpendCapUsd: 500.0
  });

  assert.strictEqual(upgradedPolicy.dailySpendCapUsd, 50.0);
  assert.strictEqual(upgradedPolicy.monthlySpendCapUsd, 500.0);
  assert.strictEqual(
    upgradedPolicy.autoPublishRequiresApproval,
    true,
    'Plan upgrade must NEVER broaden consent or turn off approval requirement'
  );
  console.log('✓ Plan upgrade safety: caps increased while preserving approval requirements');

  console.log('Prompt 050 verified successfully! (Phase D completed)');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
