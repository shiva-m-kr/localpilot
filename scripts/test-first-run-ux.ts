import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginPage, InviteAcceptancePage, EmptyWorkspaceView, MarketingLandingPage } from '@localpilot/ui';
import { AuthSecurityService } from '@localpilot/domain';

console.log('Testing Account and First-Run UX (Prompt 015)...');

// 1. Destination Preservation & Open Redirect Protection
console.log('1. Testing Safe Destination Preservation...');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('/dashboard/calendar'), '/dashboard/calendar');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('/dashboard/rankings'), '/dashboard/rankings');
// Malicious open redirect attempts must be safely sanitized to /dashboard
assert.strictEqual(AuthSecurityService.validateRedirectUrl('https://phishing.site.com/steal-creds'), '/dashboard');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('//evil.com/xss'), '/dashboard');
console.log('  ✅ Intended destination preserved safely; malicious redirects neutralized');

// 2. Visibly Explicit & Isolated Demo Mode
console.log('2. Testing Demo Mode Isolation...');
const demoSession = AuthSecurityService.createDemoSession();
assert.strictEqual(demoSession.session.isDemoMode, true);
assert.ok(demoSession.session.organizationId.startsWith('demo-org-'));
assert.ok(demoSession.session.userId.startsWith('demo-user-'));

const loginHtml = renderToStaticMarkup(
  React.createElement(LoginPage, {
    onGoogleSignIn: () => {},
    onEmailSignIn: () => {},
    onEnterDemoMode: () => {}
  })
);
assert.ok(loginHtml.includes('Enter Visually Labeled Demo Workspace'));
console.log('  ✅ Demo mode clearly labeled and separated from production accounts');

// 3. Invitation Acceptance & Expired Link Recovery
console.log('3. Testing Invitation Acceptance & Expiry Recovery...');
const validInviteHtml = renderToStaticMarkup(
  React.createElement(InviteAcceptancePage, {
    inviteStatus: 'PENDING',
    organizationName: 'Apex Services Group',
    inviterEmail: 'owner@apexservices.in',
    role: 'editor',
    onAccept: () => {}
  })
);
assert.ok(validInviteHtml.includes('Join Apex Services Group'));
assert.ok(validInviteHtml.includes('Accept Invitation &amp; Join →'));

const expiredInviteHtml = renderToStaticMarkup(
  React.createElement(InviteAcceptancePage, {
    inviteStatus: 'EXPIRED',
    organizationName: 'Apex Services Group',
    inviterEmail: 'owner@apexservices.in',
    role: 'editor',
    onAccept: () => {}
  })
);
assert.ok(expiredInviteHtml.includes('Invitation Link Expired or Revoked'));
assert.ok(expiredInviteHtml.includes('expire after 7 days'));
console.log('  ✅ Invitation acceptance and expired-link recovery guidance verified');

// 4. Empty Authenticated Workspace State
console.log('4. Testing Empty Authenticated Workspace State...');
const emptyWorkspaceHtml = renderToStaticMarkup(
  React.createElement(EmptyWorkspaceView, {
    organizationName: 'Fresh New Plumbing LLC',
    onStartOnboarding: () => {}
  })
);
assert.ok(emptyWorkspaceHtml.includes('Welcome to Fresh New Plumbing LLC'));
assert.ok(emptyWorkspaceHtml.includes('Start Business Onboarding →'));
console.log('  ✅ Empty workspace view guides new owner to first-run onboarding');

// 5. Zero Private Tenant Data Leakage on Public Screens
console.log('5. Testing Zero Tenant Data Leakage on Public Screens...');
const publicLanding = renderToStaticMarkup(React.createElement(MarketingLandingPage));
// Assert private owner phone numbers, internal tokens, or session IDs are NEVER present
assert.ok(!publicLanding.includes('+91 98450 12345'), 'Private owner phone leaked on public page');
assert.ok(!publicLanding.includes('owner.personal@example.com'), 'Private billing email leaked on public page');
assert.ok(!publicLanding.includes('sessionToken'), 'Session tokens leaked');
console.log('  ✅ Zero private tenant data or credentials leaked to public screens');

console.log('🎉 Prompt 015 verification completed successfully!');
