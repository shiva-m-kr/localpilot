import assert from 'assert';
import {
  singleLocationOrg,
  singleLocationBusiness,
  singleLocationRecord,
  multiLocationOrg,
  multiLocationBusiness,
  branchKoramangala,
  branchIndiranagar,
  foreignOrg,
  foreignBusiness,
  LocationRepository
} from '@localpilot/db';

console.log('Testing Tenant and Business Data Model (Prompt 006)...');

// 1. Single-Location Service-Area Business Fixture
console.log('1. Testing Single-Location Fixture...');
assert.strictEqual(singleLocationRecord.organizationId, singleLocationOrg.id);
assert.strictEqual(singleLocationRecord.businessId, singleLocationBusiness.id);
assert.strictEqual(singleLocationRecord.addressVisibility, 'HIDDEN_RESIDENTIAL');
assert.strictEqual(singleLocationRecord.timezone, 'Asia/Kolkata');
assert.strictEqual(singleLocationRecord.currency, 'INR');
console.log('  ✅ Single-location fixture verified');

// 2. Multi-Location Fixture
console.log('2. Testing Multi-Location Storefront Fixtures...');
assert.strictEqual(branchKoramangala.organizationId, multiLocationOrg.id);
assert.strictEqual(branchKoramangala.businessId, multiLocationBusiness.id);
assert.strictEqual(branchIndiranagar.organizationId, multiLocationOrg.id);
assert.strictEqual(branchIndiranagar.businessId, multiLocationBusiness.id);
assert.notStrictEqual(branchKoramangala.id, branchIndiranagar.id);
assert.strictEqual(branchKoramangala.addressVisibility, 'PUBLIC');
console.log('  ✅ Multi-location fixtures verified (Koramangala & Indiranagar branches)');

// 3. Residential Privacy & Address Masking
console.log('3. Testing Residential Privacy & Sensitive Contact Redaction...');
const publicServiceProfile = LocationRepository.toPublicProfile(singleLocationRecord);

// Critical verification: Street address MUST be null for hidden residential/SAB
assert.strictEqual(
  publicServiceProfile.streetAddress,
  null,
  'Private residential street address MUST be redacted in public profile'
);
assert.strictEqual(publicServiceProfile.city, 'Bengaluru');
assert.strictEqual(publicServiceProfile.postalCode, '560102');
// Verify private owner phone and billing email are not exposed in public profile
assert.strictEqual((publicServiceProfile as any).privateOwnerPhone, undefined);
assert.strictEqual((publicServiceProfile as any).privateBillingEmail, undefined);
console.log('  ✅ Residential address and private contacts successfully redacted from public profile');

// 4. Public Storefront Address Preservation
console.log('4. Testing Public Storefront Profile...');
const publicStoreProfile = LocationRepository.toPublicProfile(branchKoramangala);
assert.strictEqual(
  publicStoreProfile.streetAddress,
  '78 80-Feet Road, 4th Block, Koramangala',
  'Public physical store address should remain visible'
);
assert.strictEqual((publicStoreProfile as any).privateOwnerPhone, undefined);
console.log('  ✅ Public storefront address preserved while private details are excluded');

// 5. Cross-Organization Boundary Enforcement
console.log('5. Testing Cross-Organization Link Rejection...');
assert.throws(() => {
  // Attempting to associate singleLocationOrg with foreignBusiness from foreignOrg
  LocationRepository.validateTenantAssociation(singleLocationOrg.id, foreignBusiness);
}, /Cross-organization violation: Business 10000000-0000-0000-0000-000000000099 belongs to organization/);
console.log('  ✅ Invalid cross-tenant associations rejected at repository boundary');

console.log('🎉 Prompt 006 verification completed successfully!');
