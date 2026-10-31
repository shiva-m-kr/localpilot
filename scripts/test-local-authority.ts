import assert from 'node:assert/strict';
import {
  LocalAuthorityService,
} from '@localpilot/domain';

async function runLocalAuthorityTests() {
  console.log('--- Testing Local Authority Opportunities (Prompt 092) ---');

  const service = new LocalAuthorityService();
  const locationId = '00000000-0000-0000-0000-000000000002';

  const opportunities = service.generateOpportunities({
    locationId: locationId as any,
    businessVertical: 'Plumbing & Heating',
    city: 'Bengaluru',
    confirmedCertifications: ['ISO 9001', 'Licensed Master Plumber'],
    confirmedSuppliers: ['Jaquar', 'Kohler'],
  });

  // Test 1: Sourced opportunities generated
  console.log('Test 1: Sourced opportunities generated');
  assert.ok(opportunities.length >= 4, `Expected at least 4 opportunities, got ${opportunities.length}`);

  const types = opportunities.map(o => o.opportunityType);
  assert.ok(types.includes('TRADE_ASSOCIATION'), 'Trade Association must be present');
  assert.ok(types.includes('SUPPLIER_DISTRIBUTOR'), 'Supplier Locator must be present');
  assert.ok(types.includes('COMMUNITY_PARTNER'), 'Community Partner must be present');
  assert.ok(types.includes('EDITORIAL_PR'), 'Editorial PR must be present');

  // Test 2: Automated cold spam outreach is strictly blocked
  console.log('Test 2: Automated cold spam outreach blocked by policy');
  assert.ok(opportunities.every(o => o.isAutomatedOutreachBlocked === true), 'Automated outreach must be blocked across all opportunities');

  // Test 3: Explicit Cost Disclosures
  console.log('Test 3: Transparent cost disclosures');
  const tradeOpp = opportunities.find(o => o.opportunityType === 'TRADE_ASSOCIATION');
  assert.equal(tradeOpp?.costType, 'ANNUAL_MEMBERSHIP');
  assert.ok(tradeOpp?.costDisclosure.includes('membership dues'));

  const supplierOpp = opportunities.find(o => o.opportunityType === 'SUPPLIER_DISTRIBUTOR');
  assert.equal(supplierOpp?.costType, 'PURCHASE_VERIFICATION');

  const editorialOpp = opportunities.find(o => o.opportunityType === 'EDITORIAL_PR');
  assert.equal(editorialOpp?.costType, 'FREE');
  assert.ok(editorialOpp?.disclaimer.includes('Paid do-follow link schemes are strictly prohibited'));

  console.log('Prompt 092 verified successfully!\n');
}

runLocalAuthorityTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
