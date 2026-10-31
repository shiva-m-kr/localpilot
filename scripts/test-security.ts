import assert from 'assert';
import { TenantContext } from '@localpilot/contracts';
import {
  EncryptionService,
  SSRFValidator,
  StorageSecurityService,
  ContentSanitizer
} from '@localpilot/domain';

console.log('Testing Secrets, Uploads, and Untrusted Import Protections (Prompt 010)...');

const org1Id = '11111111-1111-1111-1111-111111111111';
const org2Id = '22222222-2222-2222-2222-222222222222';
const loc1Id = 'loc-0001';

const org1Context: TenantContext = {
  organizationId: org1Id as any,
  userId: 'user-01' as any,
  role: 'owner',
  isDemoMode: false
};

// 1. Encrypted Secrets, Key Versions & Zero Secret Leakage in DTOs
console.log('1. Testing Secret Encryption, Key Rotation & Safe DTOs...');
const masterKeyV1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const masterKeyV2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
const rawSecret = 'oauth-super-secret-refresh-token-xyz-12345';

const encryptedV1 = EncryptionService.encrypt(rawSecret, masterKeyV1, 1);
assert.strictEqual(encryptedV1.keyVersion, 1);
assert.strictEqual(EncryptionService.decrypt(encryptedV1, masterKeyV1), rawSecret);

// Key rotation
const rotatedV2 = EncryptionService.rotateKey(encryptedV1, masterKeyV1, masterKeyV2, 2);
assert.strictEqual(rotatedV2.keyVersion, 2);
assert.strictEqual(EncryptionService.decrypt(rotatedV2, masterKeyV2), rawSecret);

// Verify safe DTO strictly masks secret
const safeDTO = EncryptionService.toSafeDTO('secret-1', 'google_business_profile', rotatedV2);
assert.strictEqual(safeDTO.maskedValue, '[REDACTED]');
assert.strictEqual((safeDTO as any).ciphertext, undefined);
assert.strictEqual((safeDTO as any).rawSecret, undefined);
console.log('  ✅ Secrets encrypted with AES-256-GCM, key rotation verified, and DTOs strictly masked');

// 2. Foreign-Tenant Asset Access Rejection
console.log('2. Testing Foreign-Tenant Storage Asset Protection...');
const org1AssetPath = StorageSecurityService.buildTenantStoragePath(org1Id, loc1Id, 'photos', 'storefront.jpg');
const org2AssetPath = StorageSecurityService.buildTenantStoragePath(org2Id, 'loc-0002', 'photos', 'private_lease.pdf');

// Tenant 1 accessing its own asset succeeds
const signedDescriptor = StorageSecurityService.createSignedUrlDescriptor(org1Context, org1AssetPath);
assert.ok(signedDescriptor.signedUrl.includes(org1Id));
assert.ok(signedDescriptor.expiresAt.getTime() > Date.now());

// Tenant 1 attempting to access Tenant 2 asset MUST be blocked with TenantAccessDeniedError
assert.throws(() => {
  StorageSecurityService.createSignedUrlDescriptor(org1Context, org2AssetPath);
}, (err: any) => {
  assert.strictEqual(err.code, 'TENANT_ACCESS_DENIED');
  assert.strictEqual(err.statusCode, 403);
  return true;
});
console.log('  ✅ Foreign-tenant assets strictly inaccessible via signed URL generator');

// 3. SSRF & Unsafe URL Redirect Protection
console.log('3. Testing SSRF Prevention and Unsafe URL Redirects...');
// Disallowed schemes
assert.throws(() => SSRFValidator.validateUrl('file:///etc/passwd'), /Unsafe URL scheme/);
assert.throws(() => SSRFValidator.validateUrl('gopher://127.0.0.1:70/'), /Unsafe URL scheme/);

// Cloud metadata and loopback
assert.throws(() => SSRFValidator.validateUrl('http://169.254.169.254/latest/meta-data'), /forbidden private or metadata/);
assert.throws(() => SSRFValidator.validateUrl('http://localhost:3000/api/admin'), /forbidden private or metadata/);
assert.throws(() => SSRFValidator.validateUrl('http://127.0.0.1:5432/'), /forbidden private or metadata/);
assert.throws(() => SSRFValidator.validateUrl('http://10.0.1.50/internal-payroll'), /forbidden private network/);
assert.throws(() => SSRFValidator.validateUrl('http://192.168.1.1/router-settings'), /forbidden private network/);

// Valid public domain succeeds
const validUrl = SSRFValidator.validateUrl('https://example.com/business-page');
assert.strictEqual(validUrl.hostname, 'example.com');

// Unsafe redirect: public site redirecting to AWS metadata service MUST be caught and blocked
assert.throws(() => {
  SSRFValidator.validateRedirect('https://example.com/page', 'http://169.254.169.254/latest/meta-data');
}, /forbidden private or metadata/);

// Response size limit enforcement
assert.throws(() => {
  SSRFValidator.assertSafeContentLength(25 * 1024 * 1024); // 25MB exceeds 10MB limit
}, /exceeds maximum permitted limit/);
console.log('  ✅ SSRF targets, private subnets, oversized payloads, and unsafe redirects blocked');

// 4. File Signature (Magic Bytes) & Content Sanitization
console.log('4. Testing MIME/Signature Validation and Content Sanitization...');
// Valid PNG buffer: 89 50 4E 47
const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
ContentSanitizer.validateImageBuffer(validPngBuffer, 'image/png');

// Fake PNG (actually text/executable masquerading as PNG)
const fakePngBuffer = Buffer.from('<!DOCTYPE html><html><body>executable</body></html>');
assert.throws(() => {
  ContentSanitizer.validateImageBuffer(fakePngBuffer, 'image/png');
}, /File signature does not match declared PNG/);

// HTML / SVG Content Sanitization
const untrustedInput = `
  <h1>Welcome to Apex Plumbing</h1>
  <script>evilPayload();</script>
  <img src="logo.png" onerror="stealCookies()" />
  <a href="javascript:doEvil()">Click here</a>
`;
const sanitizedHtml = ContentSanitizer.sanitizeHtml(untrustedInput);
assert.ok(!sanitizedHtml.includes('<script>'));
assert.ok(!sanitizedHtml.includes('evilPayload'));
assert.ok(!sanitizedHtml.includes('onerror'));
assert.ok(!sanitizedHtml.includes('javascript:'));
console.log('  ✅ MIME signatures verified against magic bytes and HTML sanitized');

console.log('🎉 Prompt 010 verification completed successfully!');
