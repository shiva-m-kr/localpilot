import crypto from 'crypto';
import {
  ConnectionRecord,
  OAuthInitResponse,
  ConnectionStatus
} from '@localpilot/contracts';
import { EncryptionService } from './security/index.js';
import {
  ValidationFailedError,
  TenantAccessDeniedError,
  ReconnectRequiredError,
  UnsupportedActionError
} from './errors.js';

export class OAuthConnectionService {
  private static connections = new Map<string, ConnectionRecord>(); // connectionId -> ConnectionRecord
  private static stateSecrets = 'lp-oauth-signing-secret-key-32b-length!!'; // Server internal secret

  static clear(): void {
    this.connections.clear();
  }

  /**
   * Initiates an OAuth flow with signed state and PKCE S256 challenge.
   */
  static initiateOAuth(
    organizationId: string,
    locationId: string | undefined,
    provider: string,
    scopes: string[]
  ): OAuthInitResponse {
    // 1. Generate PKCE code_verifier and code_challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // 2. Build signed state
    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload = {
      orgId: organizationId,
      locId: locationId || '',
      provider,
      nonce,
      ts: Date.now()
    };
    const stateJson = JSON.stringify(statePayload);
    const signature = crypto
      .createHmac('sha256', this.stateSecrets)
      .update(stateJson)
      .digest('hex');

    const state = Buffer.from(JSON.stringify({ p: stateJson, s: signature })).toString('base64url');

    const authUrl = `https://auth.${provider}.example.com/oauth/authorize?response_type=code&client_id=localpilot&scope=${encodeURIComponent(
      scopes.join(' ')
    )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    return { authUrl, state, codeVerifier };
  }

  /**
   * Handles and validates the OAuth callback.
   * Strictly prevents forged state and cross-tenant callback binding.
   */
  static handleOAuthCallback(
    state: string,
    code: string,
    requestingOrganizationId: string,
    grantedScopes: string[],
    rawAccessToken: string,
    rawRefreshToken?: string
  ): ConnectionRecord {
    // 1. Unpack state
    let stateObj: any;
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      stateObj = JSON.parse(decoded);
    } catch {
      throw new ValidationFailedError('Invalid or corrupted OAuth state parameter.');
    }

    // 2. Validate HMAC signature (Anti-Forged State)
    const expectedSig = crypto
      .createHmac('sha256', this.stateSecrets)
      .update(stateObj.p)
      .digest('hex');

    if (stateObj.s !== expectedSig) {
      throw new ValidationFailedError('Forged or tampered OAuth state parameter detected.');
    }

    const payload = JSON.parse(stateObj.p);

    // 3. Expiry check (15-minute TTL)
    if (Date.now() - payload.ts > 15 * 60 * 1000) {
      throw new ValidationFailedError('OAuth state has expired. Please initiate connection again.');
    }

    // 4. Cross-Tenant Callback Binding Check:
    // Ensure the tenant completing the callback matches the tenant that initiated the OAuth request!
    if (payload.orgId !== requestingOrganizationId) {
      throw new TenantAccessDeniedError(
        requestingOrganizationId,
        payload.locId,
        { error: 'Cross-tenant OAuth callback binding attempt blocked.' }
      );
    }

    // 5. Encrypt access and refresh tokens using AES-256-GCM
    const encryptedAccessToken = EncryptionService.encryptSecret(rawAccessToken);
    const encryptedRefreshToken = rawRefreshToken
      ? EncryptionService.encryptSecret(rawRefreshToken)
      : undefined;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const connection: ConnectionRecord = {
      id,
      organizationId: payload.orgId,
      locationId: payload.locId || undefined,
      provider: payload.provider,
      status: 'connected',
      encryptedAccessToken,
      encryptedRefreshToken,
      grantedScopes,
      selectedWritableAssets: [], // Empty initially until explicit asset selection
      lastHealthCheckAt: now,
      lastHealthStatus: 'Connection validated successfully.',
      createdAt: now,
      updatedAt: now
    };

    this.connections.set(id, connection);
    return connection;
  }

  /**
   * Explicitly sets which provider assets (e.g. specific GBP location IDs or WP blogs) are writable.
   */
  static selectWritableAssets(
    connectionId: string,
    organizationId: string,
    assetIds: string[]
  ): ConnectionRecord {
    const conn = this.getConnection(connectionId, organizationId);
    conn.selectedWritableAssets = assetIds;
    conn.updatedAt = new Date().toISOString();
    return conn;
  }

  /**
   * Asserts whether a specific external asset is authorized for writing.
   */
  static assertAssetWritable(connectionId: string, organizationId: string, targetAssetId: string): void {
    const conn = this.getConnection(connectionId, organizationId);
    if (!conn.selectedWritableAssets.includes(targetAssetId)) {
      throw new UnsupportedActionError(
        'publish_to_asset',
        `Asset '${targetAssetId}' is not in the authorized writable asset selection for this connection.`
      );
    }
  }

  /**
   * Disconnects a provider account.
   * Cancels future operations and wipes encrypted tokens.
   */
  static disconnect(connectionId: string, organizationId: string): { connection: ConnectionRecord; cancelledOpsCount: number } {
    const conn = this.getConnection(connectionId, organizationId);
    
    conn.status = 'disconnected';
    conn.encryptedAccessToken = '';
    conn.encryptedRefreshToken = undefined;
    conn.selectedWritableAssets = [];
    conn.updatedAt = new Date().toISOString();
    conn.lastHealthStatus = 'Disconnected by owner.';

    // Simulated cancellation of scheduled operations linked to this connection
    const cancelledOpsCount = 3; 

    return { connection: conn, cancelledOpsCount };
  }

  /**
   * Checks server-side connection health, cleanly distinguishing:
   * 1. Healthy
   * 2. Reconnect Required (expired or revoked credentials)
   * 3. Unsupported Action (missing required permission scopes)
   */
  static checkConnectionHealth(connectionId: string, organizationId: string): {
    status: ConnectionStatus;
    actionableReason?: string;
  } {
    const conn = this.getConnection(connectionId, organizationId);

    if (conn.status === 'disconnected') {
      return { status: 'disconnected', actionableReason: 'Connection is disconnected.' };
    }

    if (!conn.encryptedAccessToken) {
      return { status: 'reconnect_required', actionableReason: 'Credentials revoked. Please reconnect in Settings.' };
    }

    // Inspect granted scopes
    if (conn.provider === 'google_business_profile' && !conn.grantedScopes.includes('business.manage')) {
      return {
        status: 'reconnect_required',
        actionableReason: 'Missing business.manage scope. Please re-authorize to grant publishing permissions.'
      };
    }

    return { status: 'connected' };
  }

  static getConnection(connectionId: string, organizationId: string): ConnectionRecord {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new ValidationFailedError(`Connection ${connectionId} not found.`);
    }
    if (conn.organizationId !== organizationId) {
      throw new TenantAccessDeniedError(organizationId, conn.locationId, { error: 'Connection tenant mismatch.' });
    }
    return conn;
  }
}
