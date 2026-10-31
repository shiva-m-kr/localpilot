import assert from 'assert';
import crypto from 'crypto';
import {
  KeywordResearchService,
  BudgetService,
  QuotaExceededError
} from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 038: LOCAL KEYWORD RESEARCH INPUTS VERIFICATION ---');

  BudgetService.clear();

  const tenantId = crypto.randomUUID();
  BudgetService.setTenantAllowance(tenantId, 20);

  // 1. Generate Candidates from confirmed business services & localities
  const candidates = KeywordResearchService.generateCandidates({
    businessName: 'Apex Plumbing',
    confirmedServices: ['Drain Cleaning', 'Water Heater Repair'],
    confirmedLocalities: ['North York']
  });

  assert.ok(candidates.length > 5);

  // Irrelevant services exclusion: e.g. "Roofing", "Electrical", "Pest Control" MUST NOT exist!
  const hasRoofing = candidates.some((c) => c.keyword.includes('roofing') || c.service.includes('Roofing'));
  assert.strictEqual(hasRoofing, false);
  console.log('✓ Irrelevant services strictly excluded from keyword candidate generation.');

  // 2. Truth-in-Metrics Acceptance: Before enrichment, volume is explicitly null and UNAVAILABLE
  // (System NEVER invents volume numbers!)
  const unmeasuredCand = candidates[0];
  assert.strictEqual(unmeasuredCand.monthlyVolume, null);
  assert.strictEqual(unmeasuredCand.difficulty, null);
  assert.strictEqual(unmeasuredCand.volumeSource, 'UNAVAILABLE');
  console.log('✓ Unmeasured keywords truthfully report null volume with UNAVAILABLE source; no invented metrics.');

  // 3. Branded vs Non-branded & Explicit vs Implied Location labels
  const brandedCand = candidates.find((c) => c.type === 'BRANDED');
  assert.strictEqual(brandedCand?.keyword, 'apex plumbing');

  const nearMeCand = candidates.find((c) => c.locationIntent === 'IMPLIED_LOCATION' && c.type === 'NON_BRANDED');
  assert.ok(nearMeCand?.keyword.includes('near me'));

  const explicitCand = candidates.find((c) => c.locationIntent === 'EXPLICIT_LOCATION');
  assert.ok(explicitCand?.keyword.includes('north york'));
  console.log('✓ Branded/non-branded and explicit/implied location labels accurately assigned.');

  // 4. Budget limit on volume enrichment
  await assert.rejects(
    async () => {
      KeywordResearchService.enrichWithMeasuredVolume(
        tenantId,
        candidates.slice(0, 5),
        crypto.randomUUID() // Invalid reservation!
      );
    },
    (err: any) => {
      assert.ok(err instanceof QuotaExceededError);
      return true;
    }
  );
  console.log('✓ Keyword enrichment strictly enforces budget reservation.');

  // 5. Valid enrichment with budget reservation
  const reservation = BudgetService.reserveCredits({
    organizationId: tenantId,
    provider: 'dataforseo',
    operation: 'keyword_volume_batch',
    estimatedCredits: 1,
    estimatedCostMicros: 10000,
    currency: 'USD',
    idempotencyKey: 'kw-enrich-1'
  });

  const enriched = KeywordResearchService.enrichWithMeasuredVolume(
    tenantId,
    candidates.slice(0, 3),
    reservation.id
  );

  assert.strictEqual(enriched.length, 3);
  assert.strictEqual(enriched[0].volumeSource, 'MEASURED_DATAFORSEO');
  assert.strictEqual(typeof enriched[0].monthlyVolume, 'number');
  assert.ok(enriched[0].observedAt);
  console.log('✓ Measured fields display truthful data source and observation date.');

  console.log('--- PROMPT 038 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
