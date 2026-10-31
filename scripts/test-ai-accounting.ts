import assert from 'assert';
import crypto from 'crypto';
import {
  AiProviderService,
  BudgetService,
  QuotaExceededError
} from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 036: CONFIGURABLE AI PROVIDERS & USAGE ACCOUNTING VERIFICATION ---');

  BudgetService.clear();

  const tenantId = crypto.randomUUID();
  BudgetService.setTenantAllowance(tenantId, 50);

  // 1. Centralized Model Configuration check: Change model configuration centrally
  const originalConfig = AiProviderService.getModelConfig('economy_text');
  assert.strictEqual(originalConfig.modelName, 'gemini-1.5-flash');

  AiProviderService.setModelConfig('economy_text', { modelName: 'gemini-2.0-flash-exp' });
  const updatedConfig = AiProviderService.getModelConfig('economy_text');
  assert.strictEqual(updatedConfig.modelName, 'gemini-2.0-flash-exp');
  console.log('✓ Model tier configurations managed centrally without scattering changes across routes.');

  // 2. Reservation Requirement Acceptance: Call without reservation MUST be blocked
  await assert.rejects(
    async () => {
      await AiProviderService.generate({
        organizationId: tenantId,
        tier: 'economy_text',
        promptVersion: 1,
        confirmedFacts: { businessName: 'Apex Plumbing' },
        instructions: 'Generate local service outline',
        reservationId: crypto.randomUUID() // Invalid reservation!
      });
    },
    (err: any) => {
      assert.ok(err instanceof QuotaExceededError);
      return true;
    }
  );
  console.log('✓ Paid AI calls strictly enforce credit reservation prior to model invocation.');

  // 3. Make valid reservation and execute generation
  const reservation = BudgetService.reserveCredits({
    organizationId: tenantId,
    provider: 'gemini',
    operation: 'generate_post',
    estimatedCredits: 1,
    estimatedCostMicros: 375,
    currency: 'USD',
    idempotencyKey: 'ai-gen-1'
  });

  const result = await AiProviderService.generate({
    organizationId: tenantId,
    tier: 'economy_text',
    promptVersion: 1,
    confirmedFacts: {
      businessName: 'Apex Master Plumbing',
      primaryService: 'Backflow Testing',
      city: 'North York'
    },
    instructions: 'Generate local service page draft',
    reservationId: reservation.id,
    expectedJsonSchema: { type: 'object' }
  });

  assert.strictEqual(result.modelUsed, 'gemini-2.0-flash-exp');
  assert.strictEqual(result.creditsCharged, 1);
  assert.ok(result.promptTokens > 0);
  assert.ok(result.completionTokens > 0);
  assert.ok(result.costMicros > 0);
  assert.strictEqual((result.content as any).isTruthful, true);
  assert.ok((result.content as any).title.includes('Backflow Testing in North York'));
  console.log('✓ Typed output generated and token/cost accurately captured in micro-units.');

  // 4. Verify usage ledger was finalized
  const balance = BudgetService.getBalance(tenantId);
  assert.strictEqual(balance.spentCredits, 1);
  assert.strictEqual(balance.reservedCredits, 0); // Released from hold to spent
  assert.strictEqual(balance.availableCredits, 49);
  console.log('✓ Usage accounting finalized reservation into tenant ledger.');

  console.log('--- PROMPT 036 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
