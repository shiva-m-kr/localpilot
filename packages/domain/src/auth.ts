import crypto from 'crypto';
import { MembershipRole } from '@localpilot/contracts';
import { BaseDomainError } from './errors.js';

export interface UserIdentity {
  id: string;
  email: string;
  fullName: string;
  provider: 'google' | 'email';
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  email: string;
  organizationId: string;
  role: MembershipRole;
  isDemoMode: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export class UnauthorizedError extends BaseDomainError {
  readonly code = 'TENANT_ACCESS_DENIED' as const;
  readonly statusCode = 401;
  readonly userAction = 'Please sign in with your authorized business account to access this workspace.';

  constructor(message: string = 'Authentication required.') {
    super(message);
  }
}

export class AuthSecurityService {
  // In-memory session revocation list / active store for validation
  private static activeSessions = new Map<string, AuthSession>();

  /**
   * Generates a cryptographically secure session token.
   */
  static createSession(
    user: UserIdentity,
    organizationId: string,
    role: MembershipRole = 'owner',
    isDemoMode: boolean = false,
    ttlHours: number = 24
  ): { token: string; session: AuthSession } {
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const session: AuthSession = {
      sessionId,
      userId: user.id,
      email: user.email,
      organizationId,
      role,
      isDemoMode,
      createdAt: now,
      expiresAt
    };

    this.activeSessions.set(token, session);
    return { token, session };
  }

  /**
   * Validates a session token and ensures it has not expired or been revoked.
   */
  static validateSession(token: string | undefined | null): AuthSession {
    if (!token) {
      throw new UnauthorizedError('Missing authentication session token.');
    }

    const session = this.activeSessions.get(token);
    if (!session) {
      throw new UnauthorizedError('Session has been invalidated or expired. Please sign in again.');
    }

    if (new Date() > session.expiresAt) {
      this.activeSessions.delete(token);
      throw new UnauthorizedError('Session expired. Please sign in again.');
    }

    return session;
  }

  /**
   * Invalidates a session upon sign-out.
   */
  static invalidateSession(token: string): boolean {
    return this.activeSessions.delete(token);
  }

  /**
   * Open redirect protection: validates that redirect targets are relative paths
   * or match the authorized application host, blocking open-redirect vulnerabilities.
   */
  static validateRedirectUrl(target: string | undefined | null, defaultUrl: string = '/dashboard'): string {
    if (!target) return defaultUrl;

    const trimmed = target.trim();
    // Allow valid relative paths (e.g. /dashboard, /onboarding), but block protocol-relative URLs (//evil.com)
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
      return trimmed;
    }

    try {
      const url = new URL(trimmed);
      // Disallow external domain redirects unless strictly whitelisted
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.localpilot.dev')) {
          return trimmed;
        }
      }
    } catch {
      // Invalid URL syntax
    }

    // Default to safe fallback if redirect target is malicious or malformed
    return defaultUrl;
  }

  /**
   * Client log and telemetry safety:
   * Strips passwords, auth tokens, integration secrets, and sensitive credentials
   * so they never appear in application logs or diagnostic traces.
   */
  static sanitizeLogPayload<T extends Record<string, any>>(payload: T): Record<string, any> {
    const sensitiveKeys = new Set([
      'token',
      'sessiontoken',
      'password',
      'secret',
      'authorization',
      'refreshtoken',
      'accesstoken',
      'apikey',
      'creditcard',
      'privatekey'
    ]);

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeLogPayload(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Visibly labeled Demo Mode Session generator.
   */
  static createDemoSession(): { token: string; session: AuthSession } {
    const demoUser: UserIdentity = {
      id: 'demo-user-00000000-0000-0000-0000-000000000000',
      email: 'demo@localpilot.dev',
      fullName: 'Demo Business Owner',
      provider: 'email'
    };

    return this.createSession(
      demoUser,
      'demo-org-00000000-0000-0000-0000-000000000000',
      'owner',
      true, // isDemoMode
      4     // 4 hour demo session
    );
  }
}
