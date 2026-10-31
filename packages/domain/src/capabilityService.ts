import {
  ProviderRegistry
} from './providerRegistry.js';
import {
  ProviderCapabilities,
  ConnectionHealth
} from '@localpilot/integrations';
import { ReconnectRequiredError, UnsupportedActionError } from './errors.js';

export interface DetailedCapabilityReport {
  providerId: string;
  status: 'connected' | 'reconnect_required' | 'disconnected';
  statusMessage: string;
  supportedActions: string[];
  blockedActions: string[];
  supportedMediaMimeTypes: string[];
  maxMediaCount: number;
  maxContentLength: number;
  requiresReviewFirst: boolean;
  reconnectReason?: string;
  nextOwnerStep?: string;
  cachedAt: string;
}

export class CapabilityService {
  private static cache = new Map<string, { report: DetailedCapabilityReport; expiresAt: number }>();
  private static CACHE_TTL_MS = 60_000; // 60s bounded freshness

  static clear(): void {
    this.cache.clear();
  }

  /**
   * Retrieves the capability report for a provider with bounded caching.
   */
  static async getCapabilityReport(
    providerId: string,
    credentials: Record<string, string>,
    forceRefresh: boolean = false
  ): Promise<DetailedCapabilityReport> {
    const now = Date.now();
    const cacheKey = `${providerId}:${credentials.siteUrl || credentials.accountId || 'default'}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.report;
      }
    }

    const adapter = ProviderRegistry.get(providerId);
    const caps = adapter.getCapabilities();
    const health = await adapter.validateConnection(credentials);

    let nextOwnerStep: string | undefined;
    let reconnectReason: string | undefined;

    if (health.status === 'reconnect_required') {
      reconnectReason = health.statusMessage;
      nextOwnerStep = 'Please click Reconnect to refresh expired integration credentials.';
    } else if (health.status === 'error') {
      reconnectReason = health.statusMessage;
      nextOwnerStep = 'Review connection settings and ensure the target endpoint is reachable.';
    }

    const report: DetailedCapabilityReport = {
      providerId,
      status: health.healthy ? 'connected' : health.status === 'reconnect_required' ? 'reconnect_required' : 'disconnected',
      statusMessage: health.statusMessage,
      supportedActions: health.healthy ? caps.supportedActions : [],
      blockedActions: health.healthy ? caps.unsupportedActions : [...caps.supportedActions, ...caps.unsupportedActions],
      supportedMediaMimeTypes: caps.supportedMediaMimeTypes,
      maxMediaCount: caps.maxMediaCount,
      maxContentLength: caps.maxContentLength,
      requiresReviewFirst: caps.requiresReviewFirst,
      reconnectReason,
      nextOwnerStep,
      cachedAt: new Date(now).toISOString()
    };

    this.cache.set(cacheKey, {
      report,
      expiresAt: now + this.CACHE_TTL_MS
    });

    return report;
  }

  /**
   * Pre-write guard: strictly invalidates cache and re-verifies live provider authorization.
   * If permissions were revoked in the interim, prevents write even if UI showed active state!
   */
  static async verifyBeforeWrite(
    providerId: string,
    credentials: Record<string, string>,
    action: string
  ): Promise<void> {
    const report = await this.getCapabilityReport(providerId, credentials, true); // Force fresh check!

    if (report.status !== 'connected') {
      throw new ReconnectRequiredError(
        providerId,
        { reason: report.statusMessage },
        '/settings/connections'
      );
    }

    if (!report.supportedActions.includes(action)) {
      throw new UnsupportedActionError(
        action,
        `Action '${action}' is not supported by ${providerId} or permission scope is not granted.`
      );
    }
  }
}
