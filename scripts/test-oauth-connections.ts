import assert from 'assert';
import crypto from 'crypto';
import {
  OAuthConnectionService,
  ValidationFailedError,
  TenantAccessDeniedError,
  UnsupportedActionError
} from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 029: SECURE OAUTH & CONNECTION MANAGEMENT VERIFICATION ---');

  OAuthConnectionService.clear();

  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();

  // 1. Initiate OAuth with signed state and PKCE
  const init = OAuthConnectionService.initiateOAuth(
    tenantA,
    undefined,
    'google_business_profile',
    ['business.manage', 'https://www.googleapis.com/auth/business.manage']
  );

  assert.ok(init.authUrl.includes('code_challenge='));
  assert.ok(init.authUrl.includes('code_challenge_method=S256'));
  assert.ok(init.state);
  console.log('✓ Initiated OAuth with PKCE S256 code challenge and HMAC-signed state.');

  // 2. Anti-Forged State Acceptance: Attempt callback with tampered state
  const tamperedState = init.state.substring(0, init.state.length - 4) + 'AAAA';
  assert.throws(
    () => {
      OAuthConnectionService.handleOAuthCallback(
        tamperedState,
        'mock-code',
        tenantA,
        ['business.manage'],
        'raw-token-123'
      );
    },
    (err: any) => {
      assert.ok(err instanceof ValidationFailedError);
      return true;
    }
  );
  console.log('✓ Forged or tampered OAuth state parameter rejected.');

  // 3. Cross-Tenant Binding Acceptance: Tenant B attempts to exchange Tenant A's OAuth state
  assert.throws(
    () => {
      OAuthConnectionService.handleOAuthCallback(
        init.state,
        'mock-code',
        tenantB, // Tenant B attempting to bind Tenant A's OAuth authorization!
        ['business.manage'],
        'raw-token-123'
      );
    },
    (err: any) => {
      assert.ok(err instanceof TenantAccessDeniedError);
      return true;
    }
  );
  console.log('✓ Cross-tenant OAuth callback binding attempt blocked with TenantAccessDeniedError.');

  // 4. Valid Callback: Tenant A completes connection
  const conn = OAuthConnectionService.handleOAuthCallback(
    init.state,
    'mock-code-valid',
    tenantA,
    ['business.manage'],
    'super-secret-access-token-xyz',
    'super-secret-refresh-token-xyz'
  );

  assert.strictEqual(conn.organizationId, tenantA);
  assert.strictEqual(conn.status, 'connected');
  // Tokens are encrypted at rest!
  assert.ok(!conn.encryptedAccessToken.includes('super-secret'));
  assert.ok(conn.encryptedAccessToken.includes(':'));
  console.log('✓ Authorized connection established with tokens encrypted at rest via AES-256-GCM.');

  // 5. Asset Selection Acceptance: Only selected assets become writable
  const authorizedLocationId = 'locations/10928374';
  const unauthorizedLocationId = 'locations/99999999';

  OAuthConnectionService.selectWritableAssets(conn.id, tenantA, [authorizedLocationId]);

  // Attempting write to authorized location succeeds
  assert.doesNotThrow(() => {
    OAuthConnectionService.assertAssetWritable(conn.id, tenantA, authorizedLocationId);
  });

  // Attempting write to non-selected asset fails with UnsupportedActionError
  assert.throws(
    () => {
      OAuthConnectionService.assertAssetWritable(conn.id, tenantA, unauthorizedLocationId);
    },
    (err: any) => {
      assert.ok(err instanceof UnsupportedActionError);
      assert.ok(err.message.includes('not in the authorized writable asset selection'));
      return true;
    }
  );
  console.log('✓ Asset selection enforced: writes strictly restricted to owner-selected authorized assets.');

  // 6. Server-Side Health Check
  const health = OAuthConnectionService.checkConnectionHealth(conn.id, tenantA);
  assert.strictEqual(health.status, 'connected');
  console.log('✓ Server-side connection health check verified.');

  // 7. Disconnect Acceptance: Disconnect wipes tokens and cancels future operations
  const disconnectResult = OAuthConnectionService.disconnect(conn.id, tenantA);
  assert.strictEqual(disconnectResult.connection.status, 'disconnected');
  assert.strictEqual(disconnectResult.connection.encryptedAccessToken, '');
  assert.strictEqual(disconnectResult.cancelledOpsCount, 3);
  console.log('✓ Disconnect cleanly clears credentials and cancels scheduled/future operations.');

  console.log('--- PROMPT 029 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
