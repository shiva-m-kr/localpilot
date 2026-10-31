import assert from 'node:assert/strict';
import {
  EntitlementsMarginService,
  EntitlementsStorage,
  TenantCostRecord,
  UsageCategory,
} from '@localpilot/domain';

async function runEntitlementsMarginTests() {
  console.log('--- Testing Entitlements, Usage UX and Margin Controls (Prompt 095) ---');

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const locationId = '00000000-0000-0000-0000-000000000002';

  const allowancesMap = new Map<UsageCategory, { limit: number; used: number; reserved: number }>([
    ['BLOG_POSTS', { limit: 12, used: 2, reserved: 0 }],
    ['SERP_SCAN_POINTS', { limit: 1000, used: 200, reserved: 0 }],
  ]);

  const costRecords: TenantCostRecord[] = [];

  const mockStorage: EntitlementsStorage = {
    async getAllowances(_locId: string) {
      return allowancesMap;
    },
    async saveAllowances(_locId: string, map: any) {
      for (const [k, v] of map.entries()) {
        allowancesMap.set(k, v);
      }
    },
    async getCostRecords(_locId: string) {
      return costRecords;
    },
    async saveCostRecord(rec: TenantCostRecord) {
      costRecords.push(rec);
    },
  };

  const service = new EntitlementsMarginService(mockStorage);

  // Test 1: Atomic reservation within limit
  console.log('Test 1: Atomic reservation within monthly limit');
  const reservation = await service.reserveUsage(locationId, 'BLOG_POSTS', 3);
  assert.equal(reservation.count, 3);
  const updatedItem = allowancesMap.get('BLOG_POSTS');
  assert.equal(updatedItem?.reserved, 3);

  // Test 2: Quota exceeded blocks overshooting (NO surprise auto-recharges)
  console.log('Test 2: Quota exceeded prevents overshooting without permission');
  // Available: 12 - (2 used + 3 reserved) = 7
  await assert.rejects(
    async () => {
      await service.reserveUsage(locationId, 'BLOG_POSTS', 8); // Needs 8, only 7 available
    },
    (err: any) => {
      assert.ok(err.message.includes('requires 8 credits, but only 7 credits are available') || err.message.includes('Usage reservation'));
      return true;
    }
  );

  // Test 3: Commit usage
  console.log('Test 3: Commit usage updates ledger');
  await service.commitUsage(locationId, 'BLOG_POSTS', 3, 3);
  const committedItem = allowancesMap.get('BLOG_POSTS');
  assert.equal(committedItem?.reserved, 0);
  assert.equal(committedItem?.used, 5); // 2 + 3

  // Test 4: Record granular operational expenses
  console.log('Test 4: Record granular operational expenses (AI vs SERP vs Support)');
  await service.recordExpense({
    tenantId,
    locationId,
    expenseCategory: 'AI_INFERENCE',
    costMinor: 35000, // ₹350 in OpenAI/Anthropic API tokens
    memo: 'LLM drafting 10 blog posts and 40 replies',
  });

  await service.recordExpense({
    tenantId,
    locationId,
    expenseCategory: 'SERP_PROVIDER',
    costMinor: 50000, // ₹500 in SERP grid scan points
    memo: 'DataForSEO SERP grid 25x25 scan',
  });

  await service.recordExpense({
    tenantId,
    locationId,
    expenseCategory: 'HUMAN_SUPPORT',
    costMinor: 25000, // ₹250 manual verification assist
    memo: 'Postal PIN verification phone assist',
  });

  // Test 5: Margin Report Calculation
  console.log('Test 5: Margin report calculation');
  const monthlyRevenueMinor = 599900; // ₹5,999 monthly plan fee
  const marginReport = await service.getMarginReport(tenantId, locationId, monthlyRevenueMinor);

  assert.equal(marginReport.aiInferenceCostMinor, 35000);
  assert.equal(marginReport.serpProviderCostMinor, 50000);
  assert.equal(marginReport.supportCostMinor, 25000);
  assert.equal(marginReport.totalCostMinor, 110000); // ₹1,100 total cost
  // Profit: 599900 - 110000 = 489900 (approx 81.7% gross margin)
  assert.ok(marginReport.grossMarginPercentage > 80.0);
  assert.equal(marginReport.isMarginHealthy, true);

  console.log('Prompt 095 verified successfully!\n');
}

runEntitlementsMarginTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
