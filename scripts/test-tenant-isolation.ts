import assert from 'assert';
import { TenantContext } from '@localpilot/contracts';
import {
  TenantSafeRepository,
  singleLocationOrg,
  singleLocationRecord,
  multiLocationOrg,
  branchKoramangala,
  Draft,
  PublishedSite
} from '@localpilot/db';

console.log('Testing Tenant Isolation & Multi-Tenant Boundaries (Prompt 009)...');

const org1Context: TenantContext = {
  organizationId: singleLocationOrg.id as any,
  userId: 'user-org1-owner' as any,
  role: 'owner',
  isDemoMode: false
};

const org2Context: TenantContext = {
  organizationId: multiLocationOrg.id as any,
  userId: 'user-org2-owner' as any,
  role: 'owner',
  isDemoMode: false
};

// 1. Cross-Tenant Read Protection
console.log('1. Testing Cross-Tenant Read Rejection...');
// Org 1 reading its own location succeeds
TenantSafeRepository.assertTenantOwnership(org1Context, singleLocationRecord, 'Location');

// Org 1 attempting to read Org 2 location (branchKoramangala) MUST fail
assert.throws(() => {
  TenantSafeRepository.assertTenantOwnership(org1Context, branchKoramangala, 'Location');
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  assert.strictEqual(err.statusCode, 403);
  assert.strictEqual(err.details?.error, 'Cross-tenant access violation');
  return true;
});
console.log('  ✅ Cross-tenant read access strictly denied');

// 2. Forged Browser Organization ID Protection
console.log('2. Testing Forged Browser Organization ID Detection...');
// When browser sends the matching ID, it resolves cleanly
const validOrg = TenantSafeRepository.resolveEffectiveOrganizationId(org1Context, singleLocationOrg.id);
assert.strictEqual(validOrg, singleLocationOrg.id);

// When browser injects a forged foreign organization ID, it MUST be rejected
assert.throws(() => {
  TenantSafeRepository.resolveEffectiveOrganizationId(org1Context, multiLocationOrg.id);
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  assert.strictEqual(err.details?.error, 'Forged browser organization ID detected');
  return true;
});
console.log('  ✅ Forged browser organization IDs rejected at server boundary');

// 3. Export Query Isolation
console.log('3. Testing Data Export Isolation...');
const mixedData = [
  { id: '1', organizationId: singleLocationOrg.id, title: 'Org 1 Data A' },
  { id: '2', organizationId: multiLocationOrg.id, title: 'Org 2 Secret B' },
  { id: '3', organizationId: singleLocationOrg.id, title: 'Org 1 Data C' }
];

const org1Export = TenantSafeRepository.filterExportForTenant(org1Context, mixedData);
assert.strictEqual(org1Export.length, 2);
assert.ok(org1Export.every(item => item.organizationId === singleLocationOrg.id));
assert.ok(!org1Export.some(item => item.title.includes('Org 2 Secret')));
console.log('  ✅ Export queries strictly filter by tenant; zero foreign tenant data leaked');

// 4. Separation of Published-Site Projections vs Private Drafts
console.log('4. Testing Published Projections vs Private Drafts Separation...');
const privateDraft: Draft = {
  id: 'draft-00000000-0000-0000-0000-000000000001',
  organizationId: singleLocationOrg.id,
  locationId: singleLocationRecord.id,
  title: 'Internal Emergency Plumbing Pricing Revision',
  content: 'Confidential rate breakdown: ₹1200 callout fee',
  internalNotes: 'DO NOT PUBLISH UNTIL OWNER SIGNS OFF ON SUNDAY RATES',
  version: '2.1-draft',
  approvalStatus: 'PENDING_REVIEW',
  createdAt: new Date(),
  updatedAt: new Date()
};

const liveSite: PublishedSite = {
  id: 'pub-00000000-0000-0000-0000-000000000001',
  organizationId: singleLocationOrg.id,
  locationId: singleLocationRecord.id,
  slug: 'apex-plumbing-bangalore',
  customDomain: 'apexplumbing.example.in',
  renderedHtml: '<html><body><h1>Apex Plumbing Bangalore</h1><p>Call us today.</p></body></html>',
  metaTitle: 'Apex Plumbing — Fast Bangalore Service',
  metaDescription: 'Trusted Bangalore plumbers',
  publishedAt: new Date(),
  isLive: true
};

// Private draft is accessible to Org 1
const fetchedDraft = TenantSafeRepository.getPrivateDraft(org1Context, privateDraft);
assert.strictEqual(fetchedDraft.title, privateDraft.title);

// Private draft is BLOCKED from Org 2
assert.throws(() => {
  TenantSafeRepository.getPrivateDraft(org2Context, privateDraft);
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  return true;
});

// Public read projection allows visitors to see published site without authentication
const publicProjection = TenantSafeRepository.getPublicSiteProjection(liveSite);
assert.ok(publicProjection !== null);
assert.strictEqual(publicProjection?.slug, 'apex-plumbing-bangalore');
// Verify internal notes and private draft content NEVER exist in public projection
assert.strictEqual((publicProjection as any).internalNotes, undefined);
assert.strictEqual((publicProjection as any).approvalStatus, undefined);
console.log('  ✅ Public read projections separated from private draft tables');

// 5. Worker Payload Reauthorization
console.log('5. Testing Worker Payload Reauthorization...');
const activeOrgs = new Set([singleLocationOrg.id, multiLocationOrg.id]);

// Valid worker payload succeeds
TenantSafeRepository.validateWorkerPayloadContext({ organizationId: singleLocationOrg.id }, activeOrgs);

// Inactive or foreign worker payload fails
assert.throws(() => {
  TenantSafeRepository.validateWorkerPayloadContext({ organizationId: 'deleted-or-invalid-org-id' }, activeOrgs);
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  return true;
});
console.log('  ✅ Worker payloads strictly revalidated against active tenant context');

console.log('🎉 Prompt 009 verification completed successfully!');
