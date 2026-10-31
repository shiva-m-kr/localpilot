import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppShell, NAV_ITEMS, TenantSelection } from '@localpilot/ui';
import { TenantContext } from '@localpilot/contracts';
import { AuthorizationService, TenantAccessDeniedError } from '@localpilot/domain';

console.log('Testing Responsive Application Shell & Navigation (Prompt 013)...');

// 1. Navigation items verification
console.log('1. Testing Navigation Items Completeness...');
const expectedNav = [
  'overview',
  'calendar',
  'studio',
  'rankings',
  'profile',
  'reviews',
  'social',
  'website',
  'citations',
  'intelligence',
  'reports'
];
assert.strictEqual(NAV_ITEMS.length, 11);
for (const id of expectedNav) {
  assert.ok(NAV_ITEMS.some(item => item.id === id), `Missing nav item: ${id}`);
}
console.log('  ✅ All 11 platform navigation modules present and structured');

// 2. Persistent Automation-Pause Indicator
console.log('2. Testing Persistent Automation-Pause Indicator...');
const sampleTenant: TenantSelection = {
  organizationId: 'org-001',
  organizationName: 'Apex Services Group',
  businessId: 'biz-001',
  businessName: 'Apex Plumbing & HVAC — Super Long Enterprise Business Name With More Than 60 Characters',
  locationId: 'loc-001',
  locationName: 'Indiranagar Main Operational Center and Fast Emergency Response Hub Bangalore'
};

const pausedShellHtml = renderToStaticMarkup(
  React.createElement(AppShell, {
    currentTenant: sampleTenant,
    availableOrganizations: [{ id: 'org-001', name: 'Apex Services Group' }],
    availableLocations: [{ id: 'loc-001', name: 'Indiranagar' }],
    onTenantChange: () => {},
    activeNavId: 'overview',
    isAutomationPaused: true,
    userEmail: 'owner@apexservices.in',
    children: React.createElement('div', null, 'Overview dashboard content')
  })
);

assert.ok(pausedShellHtml.includes('Automation PAUSED'), 'Should display persistent pause indicator');
assert.ok(pausedShellHtml.includes('role="region"'), 'Pause indicator has accessible region role');

const activeShellHtml = renderToStaticMarkup(
  React.createElement(AppShell, {
    currentTenant: sampleTenant,
    availableOrganizations: [{ id: 'org-001', name: 'Apex Services Group' }],
    availableLocations: [{ id: 'loc-001', name: 'Indiranagar' }],
    onTenantChange: () => {},
    activeNavId: 'overview',
    isAutomationPaused: false,
    userEmail: 'owner@apexservices.in',
    children: React.createElement('div', null, 'Overview dashboard content')
  })
);
assert.ok(activeShellHtml.includes('Automation Active'), 'Should display active status');
console.log('  ✅ Persistent automation pause/active indicators verified');

// 3. Layout Truncation for Extremely Long Names
console.log('3. Testing Long Name Truncation & Layout Resilience...');
assert.ok(pausedShellHtml.includes('text-overflow:ellipsis') || pausedShellHtml.includes('overflow:hidden'));
assert.ok(pausedShellHtml.includes('title="Apex Plumbing &amp; HVAC'));
console.log('  ✅ Layout resilience against long business/location names verified');

// 4. Server-Side Location Scope Authorization During Switching
console.log('4. Testing Server-Side Tenant Authorization on Switch...');
const restrictedContext: TenantContext = {
  organizationId: 'org-001' as any,
  userId: 'user-001' as any,
  role: 'editor',
  authorizedLocationIds: ['loc-001' as any], // Authorized strictly for loc-001
  isDemoMode: false
};

// Trying to act on loc-001 succeeds
AuthorizationService.assertCapability(restrictedContext, 'content:draft', 'loc-001');

// Trying to switch to loc-999 (foreign/unauthorized location) MUST be rejected by domain service
assert.throws(() => {
  AuthorizationService.assertCapability(restrictedContext, 'content:draft', 'loc-999');
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  return true;
});
console.log('  ✅ Location switching strictly enforced server-side against authorized location scopes');

// 5. Mobile Drawer Navigation Element
console.log('5. Testing Mobile Drawer & Touch Controls...');
assert.ok(pausedShellHtml.includes('id="mobile-menu-button"'));
assert.ok(pausedShellHtml.includes('aria-label="Open mobile navigation menu"'));
console.log('  ✅ Mobile drawer and touch controls verified');

console.log('🎉 Prompt 013 verification completed successfully!');
