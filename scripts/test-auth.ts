import assert from 'assert';
import { AuthSecurityService, UnauthorizedError, UserIdentity } from '@localpilot/domain';

console.log('Testing Managed Authentication & Session Security (Prompt 007)...');

// 1. Unauthenticated Access Block
console.log('1. Testing Unauthenticated Request Rejection...');
assert.throws(() => {
  AuthSecurityService.validateSession(null);
}, (err: any) => {
  assert.strictEqual(err.statusCode, 401);
  const uiError = err.toUISafeError();
  assert.strictEqual(uiError.code, 'TENANT_ACCESS_DENIED');
  assert.ok(uiError.userAction.includes('Please sign in'));
  return true;
});
console.log('  ✅ Unauthenticated request blocked with 401 and actionable recovery instructions');

// 2. Session Creation & Sign-out Invalidation
console.log('2. Testing Session Lifecycle & Sign-Out Invalidation...');
const testUser: UserIdentity = {
  id: 'user-00000000-0000-0000-0000-000000000001',
  email: 'business.owner@apexplumbing.example.in',
  fullName: 'Rajesh Kumar',
  provider: 'google'
};
const orgId = '00000000-0000-0000-0000-000000000001';

const { token, session } = AuthSecurityService.createSession(testUser, orgId, 'owner');
assert.strictEqual(session.userId, testUser.id);
assert.strictEqual(session.isDemoMode, false);

// Active session validates cleanly
const validated = AuthSecurityService.validateSession(token);
assert.strictEqual(validated.userId, testUser.id);

// Sign-out invalidates session immediately
AuthSecurityService.invalidateSession(token);
assert.throws(() => {
  AuthSecurityService.validateSession(token);
}, (err: any) => {
  assert.strictEqual(err.statusCode, 401);
  assert.ok(err.message.includes('invalidated or expired'));
  return true;
});
console.log('  ✅ Sign-out invalidates session immediately and prevents further access');

// 3. Open Redirect Prevention
console.log('3. Testing Redirect Target Validation (SSRF / Open Redirect Prevention)...');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('/onboarding/step-2'), '/onboarding/step-2');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('/dashboard'), '/dashboard');

// Malicious external redirects must be blocked and fallback to /dashboard
assert.strictEqual(AuthSecurityService.validateRedirectUrl('https://evil-phishing-site.com'), '/dashboard');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('//evil-phishing-site.com'), '/dashboard');
assert.strictEqual(AuthSecurityService.validateRedirectUrl('javascript:alert(1)'), '/dashboard');
console.log('  ✅ Malicious redirect targets sanitized and safely defaulted');

// 4. Visibly Labeled Demo Mode
console.log('4. Testing Visibly Labeled Demo Mode...');
const demoAuth = AuthSecurityService.createDemoSession();
assert.strictEqual(demoAuth.session.isDemoMode, true);
assert.ok(demoAuth.session.email.includes('demo@localpilot.dev'));
assert.ok(demoAuth.session.organizationId.startsWith('demo-org-'));
console.log('  ✅ Demo mode clearly labeled and isolated from real accounts');

// 5. Secret & Token Log Sanitization
console.log('5. Testing Telemetry & Log Sanitization (Zero Token Leakage)...');
const sampleEventPayload = {
  event: 'user_sign_in_completed',
  userId: testUser.id,
  token: token,
  sessionToken: 'sensitive-token-value',
  password: 'user-raw-password',
  apiKey: 'live-gemini-or-gsc-key',
  nestedDetails: {
    secret: 'internal-secret-token',
    userCity: 'Bengaluru'
  }
};

const sanitized = AuthSecurityService.sanitizeLogPayload(sampleEventPayload);
assert.strictEqual(sanitized.token, '[REDACTED]');
assert.strictEqual(sanitized.sessionToken, '[REDACTED]');
assert.strictEqual(sanitized.password, '[REDACTED]');
assert.strictEqual(sanitized.apiKey, '[REDACTED]');
assert.strictEqual(sanitized.nestedDetails.secret, '[REDACTED]');
assert.strictEqual(sanitized.nestedDetails.userCity, 'Bengaluru');
console.log('  ✅ Zero identity/token information appears in sanitized logs');

console.log('🎉 Prompt 007 verification completed successfully!');
