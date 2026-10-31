import assert from 'assert';
import { TenantContext } from '@localpilot/contracts';
import { AuthorizationService } from '@localpilot/domain';

console.log('Testing Roles and Location-Scoped Capabilities (Prompt 008)...');

const orgId = '123e4567-e89b-12d3-a456-426614174000' as any;
const locA = '20000000-0000-0000-0000-000000000001' as any;
const locB = '20000000-0000-0000-0000-000000000002' as any;

// 1. Editor cannot approve or publish
console.log('1. Testing Editor Role Boundaries...');
const editorContext: TenantContext = {
  organizationId: orgId,
  userId: 'user-editor-01' as any,
  role: 'editor',
  isDemoMode: false
};

assert.strictEqual(AuthorizationService.hasCapability(editorContext, 'content:draft'), true);
assert.strictEqual(AuthorizationService.hasCapability(editorContext, 'content:approve'), false);
assert.strictEqual(AuthorizationService.hasCapability(editorContext, 'content:publish'), false);

assert.throws(() => {
  AuthorizationService.assertCapability(editorContext, 'content:approve');
}, (err: any) => {
  assert.strictEqual(err.statusCode, 403);
  assert.ok(err.userAction.includes('editor'));
  assert.ok(err.userAction.includes('lacks permission'));
  return true;
});
console.log('  ✅ Editor cannot approve or publish content');

// 2. Analyst cannot mutate
console.log('2. Testing Analyst Read-Only Boundaries...');
const analystContext: TenantContext = {
  organizationId: orgId,
  userId: 'user-analyst-01' as any,
  role: 'analyst',
  isDemoMode: false
};

assert.strictEqual(AuthorizationService.hasCapability(analystContext, 'analytics:view'), true);
assert.strictEqual(AuthorizationService.hasCapability(analystContext, 'content:draft'), false);
assert.strictEqual(AuthorizationService.hasCapability(analystContext, 'facts:edit'), false);

assert.throws(() => {
  AuthorizationService.assertCapability(analystContext, 'content:draft');
}, (err: any) => {
  assert.strictEqual(err.statusCode, 403);
  return true;
});
console.log('  ✅ Analyst can view analytics but cannot mutate any resources');

// 3. Billing access does not reveal tokens
console.log('3. Testing Billing Manager Isolation...');
const billingContext: TenantContext = {
  organizationId: orgId,
  userId: 'user-billing-01' as any,
  role: 'billing_manager',
  isDemoMode: false
};

assert.strictEqual(AuthorizationService.hasCapability(billingContext, 'billing:manage'), true);
assert.strictEqual(AuthorizationService.hasCapability(billingContext, 'integrations:view_tokens'), false);

assert.throws(() => {
  AuthorizationService.assertCapability(billingContext, 'integrations:view_tokens');
}, (err: any) => {
  assert.strictEqual(err.statusCode, 403);
  return true;
});
console.log('  ✅ Billing manager cannot view integration tokens or secrets');

// 4. Location-Scoped Access: Forged Request ID Blocked
console.log('4. Testing Location-Scoped Member Authorization...');
const locationRestrictedContext: TenantContext = {
  organizationId: orgId,
  userId: 'user-loc-editor-01' as any,
  role: 'editor',
  authorizedLocationIds: [locA], // Restricted strictly to Location A
  isDemoMode: false
};

// Acting on authorized location A succeeds
assert.strictEqual(AuthorizationService.hasCapability(locationRestrictedContext, 'content:draft', locA), true);
AuthorizationService.assertCapability(locationRestrictedContext, 'content:draft', locA);

// Attempting to act on Location B by forging locationId in request MUST throw TenantAccessDeniedError
assert.strictEqual(AuthorizationService.hasCapability(locationRestrictedContext, 'content:draft', locB), false);
assert.throws(() => {
  AuthorizationService.assertCapability(locationRestrictedContext, 'content:draft', locB);
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  assert.strictEqual(err.statusCode, 403);
  return true;
});
console.log('  ✅ Member restricted to Location A cannot act on Location B by changing request ID');

// 5. Team Invites & Ownership Transfer
console.log('5. Testing Team Invites & Ownership Transfer Constraints...');
const ownerContext: TenantContext = {
  organizationId: orgId,
  userId: 'user-owner-01' as any,
  role: 'owner',
  isDemoMode: false
};

const invite = AuthorizationService.createInvite(ownerContext, 'newmember@example.com', 'editor', [locA]);
assert.strictEqual(invite.status, 'PENDING');
assert.strictEqual(invite.authorizedLocationIds?.[0], locA);

// Admin cannot transfer ownership
const adminContext: TenantContext = {
  organizationId: orgId,
  userId: 'user-admin-01' as any,
  role: 'admin',
  isDemoMode: false
};
assert.throws(() => {
  AuthorizationService.transferOwnership(adminContext, 'target-user');
}, (err: any) => {
  assert.strictEqual(err.statusCode, 403);
  return true;
});

// Owner can safely transfer ownership
const transfer = AuthorizationService.transferOwnership(ownerContext, 'target-user');
assert.strictEqual(transfer.previousOwnerRole, 'admin');
assert.strictEqual(transfer.newOwnerRole, 'owner');
console.log('  ✅ Safe invite lifecycle and strict ownership transfer verified');

console.log('🎉 Prompt 008 verification completed successfully!');
