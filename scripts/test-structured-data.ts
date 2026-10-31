import assert from 'node:assert/strict';
import {
  StructuredDataService,
  SitePublicFacts,
} from '@localpilot/domain';

async function runStructuredDataTests() {
  console.log('--- Testing Accurate Local-Business Structured Data (Prompt 085) ---');

  const service = new StructuredDataService();

  // Test 1: Category Mapping
  console.log('Test 1: Category Mapping to Schema.org subtype');
  assert.equal(service.mapCategoryToSubtype('Emergency Plumber & Drain Cleaning'), 'Plumber');
  assert.equal(service.mapCategoryToSubtype('Dental Clinic & Orthodontics'), 'Dentist');
  assert.equal(service.mapCategoryToSubtype('Hair Salon & Spa'), 'HairSalon');
  assert.equal(service.mapCategoryToSubtype('HVAC Air Conditioning Repair'), 'HVACBusiness');
  assert.equal(service.mapCategoryToSubtype('Miscellaneous Consulting'), 'LocalBusiness');

  // Test 2: SAB Address Suppression in Schema.org JSON-LD
  console.log('Test 2: SAB Address and Coordinates Suppression');
  const sabFacts: SitePublicFacts = {
    businessName: 'Apex Emergency Plumbing',
    tagline: '24/7 Leak & Drain Specialists',
    category: 'Plumber',
    phone: '+919876543210',
    email: 'contact@apexplumbing.example.com',
    isSAB: true,
    hasHiddenAddress: true,
    streetAddress: '78 Hidden Home Office Street',
    city: 'New Delhi',
    stateOrRegion: 'Delhi',
    postalCode: '110001',
    country: 'IN',
    latitude: 28.6139,
    longitude: 77.2090,
    operatingHours: [
      { dayOfWeek: 'MONDAY', opens: '08:00', closes: '20:00', isClosed: false },
    ],
    serviceAreas: ['South Delhi', 'Central Delhi', 'Noida'],
  };

  const sabResult = service.generateLocalBusinessJsonLd('https://apexplumbing.localpilot.site', sabFacts);
  assert.equal(sabResult.schemaType, 'Plumber');
  assert.equal(sabResult.entityId, 'https://apexplumbing.localpilot.site/#localbusiness');
  assert.equal(sabResult.isSABAddressSuppressed, true);
  assert.equal(sabResult.schemaObject.address.streetAddress, undefined, 'Street address must be omitted for SAB!');
  assert.equal(sabResult.schemaObject.geo, undefined, 'Coordinates must be omitted for SAB!');
  assert.equal(sabResult.schemaObject.address.addressLocality, 'New Delhi');
  assert.equal(sabResult.schemaObject.address.postalCode, '110001');
  assert.equal(sabResult.schemaObject.areaServed.length, 3);

  // Test 3: Physical Storefront includes address and coordinates
  console.log('Test 3: Storefront includes physical address and coordinates');
  const storefrontFacts: SitePublicFacts = {
    businessName: 'Connaught Place Bakery & Cafe',
    tagline: 'Fresh Artisanal Breads and Coffee',
    category: 'Restaurant',
    phone: '+911123456789',
    isSAB: false,
    hasHiddenAddress: false,
    streetAddress: 'Block A, Inner Circle, Connaught Place',
    city: 'New Delhi',
    stateOrRegion: 'Delhi',
    postalCode: '110001',
    country: 'IN',
    latitude: 28.6315,
    longitude: 77.2167,
    operatingHours: [
      { dayOfWeek: 'MONDAY', opens: '09:00', closes: '22:00', isClosed: false },
    ],
    serviceAreas: [],
  };

  const storefrontResult = service.generateLocalBusinessJsonLd('https://cpbakery.com', storefrontFacts);
  assert.equal(storefrontResult.schemaType, 'Restaurant');
  assert.equal(storefrontResult.isSABAddressSuppressed, false);
  assert.equal(storefrontResult.schemaObject.address.streetAddress, 'Block A, Inner Circle, Connaught Place');
  assert.equal(storefrontResult.schemaObject.geo.latitude, 28.6315);
  assert.equal(storefrontResult.schemaObject.geo.longitude, 77.2167);

  // Test 4: Self-serving AggregateRating exclusion
  console.log('Test 4: Self-serving AggregateRating exclusion per Google guidelines');
  const selfServingResult = service.generateLocalBusinessJsonLd(
    'https://cpbakery.com',
    storefrontFacts,
    { hasSelfServingReviews: true }
  );
  assert.equal(selfServingResult.selfServingRatingExcluded, true);
  assert.equal(selfServingResult.schemaObject.aggregateRating, undefined, 'AggregateRating must NOT be added to LocalBusiness schema!');
  assert.ok(selfServingResult.validationIssues.some(i => i.field === 'aggregateRating'));

  // Test 5: Honest marketing disclaimer
  console.log('Test 5: Marketing disclaimer against guaranteed rich results');
  assert.ok(sabResult.marketingDisclaimer.includes('structured markup does not guarantee rich snippets or review stars'));

  console.log('Prompt 085 verified successfully!\n');
}

runStructuredDataTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
