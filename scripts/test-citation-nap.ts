import assert from 'node:assert/strict';
import {
  CitationNapService,
  SitePublicFacts,
  DiscoveredDirectoryListing,
} from '@localpilot/domain';

async function runCitationNapTests() {
  console.log('--- Testing Citation Identity and NAP Comparison (Prompt 090) ---');

  const napService = new CitationNapService();
  const locationId = '00000000-0000-0000-0000-000000000002';

  // Base confirmed facts for a storefront business
  const storefrontFacts: SitePublicFacts = {
    businessName: 'Apex Plumbing Supplies Pvt Ltd',
    tagline: 'Wholesale and Retail Plumbing Store',
    category: 'Plumber',
    phone: '+919876543210',
    email: 'sales@apexplumbing.example.com',
    websiteUrl: 'https://apexplumbing.example.com',
    isSAB: false,
    hasHiddenAddress: false,
    streetAddress: '12 MG Road, Floor 2',
    city: 'Bengaluru',
    stateOrRegion: 'Karnataka',
    postalCode: '560001',
    country: 'IN',
    operatingHours: [],
    serviceAreas: [],
  };

  // Test 1: Exact Match
  console.log('Test 1: Exact Match across all fields');
  const exactListing: DiscoveredDirectoryListing = {
    directoryId: 'justdial-in',
    directoryName: 'Justdial',
    listingUrl: 'https://justdial.com/Bengaluru/Apex-Plumbing-Supplies-Pvt-Ltd',
    observedName: 'Apex Plumbing Supplies Pvt Ltd',
    observedPhone: '+919876543210',
    observedAddress: '12 MG Road, Floor 2',
    observedWebsite: 'https://apexplumbing.example.com',
  };

  const exactResult = napService.compareListing(locationId, storefrontFacts, exactListing);
  assert.equal(exactResult.overallNapStatus, 'CONSISTENT');
  assert.equal(exactResult.matchConfidence, 'HIGH_CONFIDENCE_MATCH');
  assert.equal(exactResult.isOwnedAndVerified, false, 'Discovered listing is not automatically counted as owned');
  assert.ok(exactResult.fieldComparisons.every((f) => f.status === 'EXACT_MATCH'));

  // Test 2: Cosmetic Formatting Variations
  console.log('Test 2: Cosmetic Variations (Street abbreviation, phone dashes, legal suffix)');
  const cosmeticListing: DiscoveredDirectoryListing = {
    directoryId: 'indiamart-in',
    directoryName: 'IndiaMART',
    listingUrl: 'https://indiamart.com/apex-plumbing',
    observedName: 'Apex Plumbing Supplies', // Suffix "Pvt Ltd" omitted
    observedPhone: '098765-43210',          // Local leading 0 and dash
    observedAddress: '12 MG Rd, Fl 2',     // "Rd" vs "Road", "Fl" vs "Floor"
    observedWebsite: 'http://www.apexplumbing.example.com/', // http + www + slash
  };

  const cosmeticResult = napService.compareListing(locationId, storefrontFacts, cosmeticListing);
  assert.equal(cosmeticResult.overallNapStatus, 'NEEDS_UPDATE');
  assert.equal(cosmeticResult.matchConfidence, 'HIGH_CONFIDENCE_MATCH');
  assert.ok(cosmeticResult.fieldComparisons.some((f) => f.field === 'NAME' && f.status === 'FORMATTING_VARIATION'));
  assert.ok(cosmeticResult.fieldComparisons.some((f) => f.field === 'PHONE' && f.status === 'FORMATTING_VARIATION'));
  assert.ok(cosmeticResult.fieldComparisons.some((f) => f.field === 'ADDRESS' && f.status === 'FORMATTING_VARIATION'));
  assert.ok(cosmeticResult.fieldComparisons.some((f) => f.field === 'WEBSITE' && f.status === 'FORMATTING_VARIATION'));

  // Test 3: Service Area Business (SAB) Address Privacy Guard
  console.log('Test 3: SAB Address Privacy (street address omitted, not penalized)');
  const sabFacts: SitePublicFacts = {
    ...storefrontFacts,
    isSAB: true,
    hasHiddenAddress: true,
    streetAddress: '99 Secret Private Residence Lane',
  };

  const sabListing: DiscoveredDirectoryListing = {
    directoryId: 'justdial-in',
    directoryName: 'Justdial',
    listingUrl: 'https://justdial.com/Bengaluru/Apex-Plumbing',
    observedName: 'Apex Plumbing Supplies Pvt Ltd',
    observedPhone: '+919876543210',
    observedAddress: undefined, // Directory correctly omits street address for SAB
    observedCity: 'Bengaluru',
  };

  const sabResult = napService.compareListing(locationId, sabFacts, sabListing);
  assert.equal(sabResult.isSABProtected, true);
  const sabAddressComparison = sabResult.fieldComparisons.find((f) => f.field === 'ADDRESS');
  assert.equal(sabAddressComparison?.status, 'NOT_APPLICABLE_SAB_HIDDEN');
  assert.ok(!sabAddressComparison?.confirmedValue.includes('Secret Private Residence Lane'), 'Secret address must NOT leak!');
  assert.ok(sabAddressComparison?.differenceExplanation.includes('Service Area Business (SAB) address is intentionally hidden'));

  // Test 4: Ambiguous Match Detection (similar phone, but different business name)
  console.log('Test 4: Ambiguous Match requires owner confirmation, never auto-merges');
  const ambiguousListing: DiscoveredDirectoryListing = {
    directoryId: 'justdial-in',
    directoryName: 'Justdial',
    listingUrl: 'https://justdial.com/Bengaluru/Apex-Electrical-Lighting',
    observedName: 'Apex Electrical & Lighting Works', // Completely different trade name!
    observedPhone: '+919876543210',
    observedAddress: '12 MG Road',
  };

  const ambiguousResult = napService.compareListing(locationId, storefrontFacts, ambiguousListing);
  assert.equal(ambiguousResult.matchConfidence, 'AMBIGUOUS_MATCH_REQUIRES_OWNER_CONFIRMATION');
  assert.equal(ambiguousResult.overallNapStatus, 'PENDING_OWNER_CONFIRMATION');

  // Test 5: Critical NAP Conflict (Wrong phone number)
  console.log('Test 5: Critical NAP Conflict (Wrong phone number)');
  const wrongPhoneListing: DiscoveredDirectoryListing = {
    directoryId: 'justdial-in',
    directoryName: 'Justdial',
    listingUrl: 'https://justdial.com/Bengaluru/Apex-Plumbing',
    observedName: 'Apex Plumbing Supplies Pvt Ltd',
    observedPhone: '+919999999999', // Completely wrong phone
    observedAddress: '12 MG Road, Floor 2',
  };

  const wrongPhoneResult = napService.compareListing(locationId, storefrontFacts, wrongPhoneListing);
  assert.equal(wrongPhoneResult.overallNapStatus, 'CRITICAL_NAP_CONFLICT');
  const phoneComp = wrongPhoneResult.fieldComparisons.find((f) => f.field === 'PHONE');
  assert.equal(phoneComp?.status, 'CRITICAL_MISMATCH');

  console.log('Prompt 090 verified successfully!\n');
}

runCitationNapTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
