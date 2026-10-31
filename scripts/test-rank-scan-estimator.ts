import { randomUUID } from 'crypto';
import assert from 'assert';
import { RankScanEstimatorService } from '../packages/domain/src/rankScanEstimatorService.js';
import { RankGridConfigService } from '../packages/domain/src/rankGridConfigService.js';
import { BudgetService } from '../packages/domain/src/budgetService.js';
import { QuotaExceededError, ValidationFailedError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 053: Implement scan estimates and bounded scheduling...');

  RankScanEstimatorService.reset();
  RankGridConfigService.reset();
  BudgetService.clear();

  const orgId = randomUUID();
  const locId = randomUUID();

  // Create standard 5x5 grid config (25 points) with 3 keywords
  const config = RankGridConfigService.createConfig({
    organizationId: orgId,
    locationId: locId,
    centerLat: 30.2672,
    centerLng: -97.7431,
    gridSize: '5x5', // 25 points
    spacingKm: 2.0,
    keywords: ['roof repair austin', 'emergency roof tarping', 'commercial roofing austin'], // 3 keywords
    device: 'MOBILE',
    depth: 20,
    target: {
      businessName: 'Apex Roofing & Restoration',
      placeId: 'ChIJ_apex_north_99',
      hideResidentialStreetAddress: true,
      city: 'Austin',
      state: 'TX'
    }
  });

  // Set initial allowance of 100 credits
  BudgetService.setTenantAllowance(orgId, 100);

  // 1. Calculate Standard Estimate (4 scans/month)
  const estimateStandard = RankScanEstimatorService.calculateEstimate({
    organizationId: orgId,
    config,
    frequency: 'FOUR_TIMES_MONTHLY',
    mode: 'STANDARD_QUEUED'
  });

  assert.strictEqual(estimateStandard.totalTasksPerRun, 75); // 3 keywords * 25 points
  assert.strictEqual(estimateStandard.totalTasksPerMonth, 300); // 75 * 4
  assert.strictEqual(estimateStandard.estimatedMonthlyCostUsd, 0.6); // 300 * $0.002 = $0.60
  assert.strictEqual(estimateStandard.requiredCredits, 30);
  assert.strictEqual(estimateStandard.canAfford, true);
  console.log(`✓ Standard 4-scans/month estimated accurately (300 tasks = $${estimateStandard.estimatedMonthlyCostUsd}, 30 credits)`);

  // 2. Mode and Depth Multipliers
  const estimateLiveDeep = RankScanEstimatorService.calculateEstimate({
    organizationId: orgId,
    config: { ...config, depth: 100 }, // Depth > 50 -> 1.25x
    frequency: 'FOUR_TIMES_MONTHLY',
    mode: 'PRIORITY_LIVE' // 1.5x
  });

  assert.strictEqual(estimateLiveDeep.depthMultiplier, 1.25);
  assert.strictEqual(estimateLiveDeep.modeMultiplier, 1.5);
  // Cost per task = $0.002 * 1.25 * 1.5 = $0.00375 (3750 micros)
  // Total cost = 300 * 3750 = 1,125,000 micros = $1.125
  assert.strictEqual(estimateLiveDeep.estimatedMonthlyCostUsd, 1.125);
  console.log(`✓ Depth (1.25x) and Live Priority (1.5x) multipliers accurately costed ($${estimateLiveDeep.estimatedMonthlyCostUsd})`);

  // 3. Starter Tier Guard: Daily scans and 7x7 grids rejected on Starter
  assert.throws(
    () => {
      RankScanEstimatorService.scheduleScan({
        organizationId: orgId,
        locationId: locId,
        config,
        frequency: 'DAILY', // Daily not allowed on starter!
        mode: 'STANDARD_QUEUED',
        idempotencyKey: 'cmd-daily-1',
        subscriptionTier: 'STARTER'
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Daily scans must be rejected on starter tier'
  );
  console.log('✓ Starter tier protected: daily scan request rejected to prevent runaway provider bills');

  // 4. Over-Budget Scan Rejection
  BudgetService.setTenantAllowance(orgId, 10); // Only 10 credits available, 30 required
  assert.throws(
    () => {
      RankScanEstimatorService.scheduleScan({
        organizationId: orgId,
        locationId: locId,
        config,
        frequency: 'FOUR_TIMES_MONTHLY',
        mode: 'STANDARD_QUEUED',
        idempotencyKey: 'cmd-overbudget',
        subscriptionTier: 'GROWTH'
      });
    },
    (err: any) => err instanceof QuotaExceededError,
    'Over-budget scan must throw QuotaExceededError'
  );
  console.log('✓ Over-budget scan blocked from starting (QuotaExceededError)');

  // 5. Successful Scheduling & Double-Click Idempotency
  BudgetService.setTenantAllowance(orgId, 200); // Sufficient credits

  const firstSchedule = RankScanEstimatorService.scheduleScan({
    organizationId: orgId,
    locationId: locId,
    config,
    frequency: 'FOUR_TIMES_MONTHLY',
    mode: 'STANDARD_QUEUED',
    idempotencyKey: 'cmd-click-double',
    subscriptionTier: 'GROWTH'
  });

  assert.strictEqual(firstSchedule.isDuplicate, false);
  const balanceAfterFirst = BudgetService.getBalance(orgId);

  // Double-click with same idempotency key
  const secondSchedule = RankScanEstimatorService.scheduleScan({
    organizationId: orgId,
    locationId: locId,
    config,
    frequency: 'FOUR_TIMES_MONTHLY',
    mode: 'STANDARD_QUEUED',
    idempotencyKey: 'cmd-click-double',
    subscriptionTier: 'GROWTH'
  });

  assert.strictEqual(secondSchedule.isDuplicate, true, 'Double-click must be flagged duplicate');
  assert.strictEqual(secondSchedule.command.id, firstSchedule.command.id);
  const balanceAfterSecond = BudgetService.getBalance(orgId);
  assert.strictEqual(balanceAfterSecond.availableCredits, balanceAfterFirst.availableCredits, 'Double-click must not double-charge credits');
  console.log('✓ Double-click idempotency verified: reuses existing schedule command without double-billing');

  console.log('Prompt 053 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
