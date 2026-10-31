import assert from 'assert';
import crypto from 'crypto';
import { BudgetService, QuotaExceededError } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 024: ATOMIC USAGE RESERVATIONS & BUDGETS VERIFICATION ---');

  BudgetService.clear();

  const tenantId = crypto.randomUUID();
  // 1. Set initial allowance of 100 credits
  BudgetService.setTenantAllowance(tenantId, 100);

  const initialBalance = BudgetService.getBalance(tenantId);
  assert.strictEqual(initialBalance.totalAllowanceCredits, 100);
  assert.strictEqual(initialBalance.spentCredits, 0);
  assert.strictEqual(initialBalance.reservedCredits, 0);
  assert.strictEqual(initialBalance.availableCredits, 100);
  console.log('✓ Initial tenant credit allowance established.');

  // 2. Reserve 40 credits for geo-grid ranking scan
  const res1 = BudgetService.reserveCredits({
    organizationId: tenantId,
    provider: 'dataforseo',
    operation: 'rank_grid_scan_7x7',
    estimatedCredits: 40,
    estimatedCostMicros: 400000,
    currency: 'USD',
    idempotencyKey: 'scan-1'
  });

  assert.strictEqual(res1.status, 'reserved');
  const balAfterRes1 = BudgetService.getBalance(tenantId);
  assert.strictEqual(balAfterRes1.reservedCredits, 40);
  assert.strictEqual(balAfterRes1.availableCredits, 60);
  console.log('✓ Reserved 40 credits; balance accurately separates reserved from available.');

  // 3. Repeated reservation with same idempotency key returns existing reservation without double-holding
  const res1Duplicate = BudgetService.reserveCredits({
    organizationId: tenantId,
    provider: 'dataforseo',
    operation: 'rank_grid_scan_7x7',
    estimatedCredits: 40,
    estimatedCostMicros: 400000,
    currency: 'USD',
    idempotencyKey: 'scan-1'
  });
  assert.strictEqual(res1Duplicate.id, res1.id);
  const balAfterDupe = BudgetService.getBalance(tenantId);
  assert.strictEqual(balAfterDupe.reservedCredits, 40); // Did not double-hold!
  console.log('✓ Idempotent reservation: duplicate call does not double-hold credits.');

  // 4. Overspend prevention: Try to reserve 70 credits when only 60 are available
  assert.throws(
    () => {
      BudgetService.reserveCredits({
        organizationId: tenantId,
        provider: 'openai',
        operation: 'article_generation_heavy',
        estimatedCredits: 70,
        estimatedCostMicros: 700000,
        currency: 'USD',
        idempotencyKey: 'heavy-article'
      });
    },
    (err: any) => {
      assert.ok(err instanceof QuotaExceededError);
      return true;
    }
  );
  console.log('✓ Overspend prevented: QuotaExceededError raised when reservation exceeds available credits.');

  // 5. Finalize res1: Actual used 35 credits (less than 40 estimated)
  BudgetService.finalizeReservation(res1.id, 35, 350000);
  const balAfterFinalize = BudgetService.getBalance(tenantId);
  assert.strictEqual(balAfterFinalize.spentCredits, 35);
  assert.strictEqual(balAfterFinalize.reservedCredits, 0); // Released the 5 credit surplus
  assert.strictEqual(balAfterFinalize.availableCredits, 65); // 100 - 35 = 65
  console.log('✓ Finalized reservation: charged 35 credits and released 5 unused hold credits.');

  // 6. Repeated finalization does NOT double-charge
  BudgetService.finalizeReservation(res1.id, 35, 350000);
  const balAfterRepeatFinalize = BudgetService.getBalance(tenantId);
  assert.strictEqual(balAfterRepeatFinalize.spentCredits, 35); // Still 35!
  console.log('✓ Repeated finalization does not double charge.');

  // 7. Cancellation / Failed work release
  const res2 = BudgetService.reserveCredits({
    organizationId: tenantId,
    provider: 'wordpress',
    operation: 'post_media_upload',
    estimatedCredits: 20,
    estimatedCostMicros: 200000,
    currency: 'USD',
    idempotencyKey: 'upload-cancelled'
  });

  const balBeforeRelease = BudgetService.getBalance(tenantId);
  assert.strictEqual(balBeforeRelease.reservedCredits, 20);
  assert.strictEqual(balBeforeRelease.availableCredits, 45);

  // Release reservation upon task cancellation/failure
  BudgetService.releaseReservation(res2.id, 'Task cancelled by user');
  const balAfterRelease = BudgetService.getBalance(tenantId);
  assert.strictEqual(balAfterRelease.reservedCredits, 0);
  assert.strictEqual(balAfterRelease.spentCredits, 35);
  assert.strictEqual(balAfterRelease.availableCredits, 65); // Fully restored!
  console.log('✓ Cancelled/failed work releases reservation back to available balance.');

  console.log('--- PROMPT 024 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
