import assert from 'node:assert/strict';
import {
  CitationCatalogService,
} from '@localpilot/domain';

async function runCitationCatalogTests() {
  console.log('--- Testing Country/Category Directory Catalog (Prompt 089) ---');

  const catalogService = new CitationCatalogService();

  // Test 1: India Directory Catalog query
  console.log('Test 1: India Directory Catalog query');
  const indiaDirs = catalogService.getDirectories({
    country: 'IN',
    vertical: 'HOME_SERVICES',
  });

  assert.ok(indiaDirs.length >= 4, `Expected at least 4 directories, found ${indiaDirs.length}`);
  const names = indiaDirs.map(d => d.name);
  assert.ok(names.includes('Google Business Profile'), 'Google Business Profile must be present');
  assert.ok(names.includes('Justdial'), 'Justdial must be present');
  assert.ok(names.includes('Sulekha'), 'Sulekha must be present');
  assert.ok(names.includes('Apple Business Connect'), 'Global Apple Maps must be included');

  // Test 2: Submission Strategy Evaluation - Automated API Dispatch
  console.log('Test 2: Authorized API directory produces AUTOMATED_API_DISPATCH');
  const gbpStrategy = catalogService.evaluateSubmissionStrategy('gbp-in');
  assert.equal(gbpStrategy.strategy, 'AUTOMATED_API_DISPATCH');
  assert.ok(gbpStrategy.reason.includes('Authorized direct API integration'));

  // Test 3: Submission Strategy Evaluation - Partner Data Feed
  console.log('Test 3: Partner Data Feed directory produces PARTNER_DATA_FEED');
  const appleStrategy = catalogService.evaluateSubmissionStrategy('apple-maps-global');
  assert.equal(appleStrategy.strategy, 'PARTNER_DATA_FEED');
  assert.ok(appleStrategy.reason.includes('partner data feed'));

  // Test 4: Manual Portal directory produces OWNER_TASK_REQUIRED (no unauthorized bot scraping)
  console.log('Test 4: Manual OTP directory produces OWNER_TASK_REQUIRED');
  const justdialStrategy = catalogService.evaluateSubmissionStrategy('justdial-in');
  assert.equal(justdialStrategy.strategy, 'OWNER_TASK_REQUIRED');
  assert.equal(justdialStrategy.requiresOwnerOtp, true);
  assert.ok(justdialStrategy.actionableUrl?.includes('justdial.com'));
  assert.ok(justdialStrategy.reason.includes('Automated bot submission is strictly prohibited'));

  // Test 5: Explicit Fee Disclosure
  console.log('Test 5: Explicit fee disclosure for paid/optional directories');
  const bbbStrategy = catalogService.evaluateSubmissionStrategy('bbb-us');
  assert.equal(bbbStrategy.strategy, 'OWNER_TASK_REQUIRED');
  assert.ok(bbbStrategy.feeDisclosure.includes('membership dues') || bbbStrategy.feeDisclosure.includes('Accreditation'));

  console.log('Prompt 089 verified successfully!\n');
}

runCitationCatalogTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
