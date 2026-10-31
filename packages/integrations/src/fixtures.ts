import {
  ProviderAdapter,
  ProviderCapabilities,
  ConnectionHealth,
  PublishablePayload,
  PublishResult,
  ReconcileResult,
  EvidenceRecord
} from './adapter.js';

export class BaseProviderAdapter implements ProviderAdapter {
  constructor(
    public readonly providerId: string,
    private readonly capabilities: ProviderCapabilities
  ) {}

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  async validateConnection(credentials: Record<string, string>): Promise<ConnectionHealth> {
    if (!credentials.apiKey && !credentials.accessToken && !credentials.applicationPassword) {
      return {
        healthy: false,
        status: 'reconnect_required',
        lastCheckedAt: new Date().toISOString(),
        statusMessage: 'Missing credentials.'
      };
    }
    return {
      healthy: true,
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
      statusMessage: 'Connection authenticated.'
    };
  }

  async publish(credentials: Record<string, string>, payload: PublishablePayload): Promise<PublishResult> {
    // 1. Validate media MIME types against capabilities
    for (const mime of payload.mediaMimeTypes) {
      if (!this.capabilities.supportedMediaMimeTypes.includes(mime)) {
        throw new Error(
          `Provider '${this.providerId}' does not support media type '${mime}'. Supported: ${this.capabilities.supportedMediaMimeTypes.join(', ')}`
        );
      }
    }

    // 2. Validate content length
    if (payload.content.length > this.capabilities.maxContentLength) {
      throw new Error(
        `Content length ${payload.content.length} exceeds maximum limit ${this.capabilities.maxContentLength} for ${this.providerId}.`
      );
    }

    return {
      providerId: this.providerId,
      externalId: `${this.providerId}-ext-${payload.itemId}`,
      publishedUrl: `https://${this.providerId}.example.com/posts/${payload.itemId}`,
      publishedAt: new Date().toISOString()
    };
  }

  async reconcile(credentials: Record<string, string>, externalIdOrKey: string): Promise<ReconcileResult> {
    return {
      providerId: this.providerId,
      externalId: externalIdOrKey,
      state: 'confirmed_published',
      publishedUrl: `https://${this.providerId}.example.com/posts/${externalIdOrKey}`,
      observedAt: new Date().toISOString(),
      notes: 'Verified via GET endpoint'
    };
  }

  async fetchEvidence(credentials: Record<string, string>, query: Record<string, unknown>): Promise<EvidenceRecord[]> {
    return [
      {
        source: this.providerId,
        metricName: 'observed_activity_count',
        value: 12,
        observedAt: new Date().toISOString(),
        windowDays: 30
      }
    ];
  }
}

// Deterministic Fixtures for the 4 core providers
export const WordPressFixtureCapabilities: ProviderCapabilities = {
  providerId: 'wordpress',
  supportedActions: ['publish_post', 'update_post', 'upload_media'],
  unsupportedActions: ['edit_robots_txt', 'modify_core_seo_plugin'],
  supportedMediaMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxMediaCount: 10,
  maxContentLength: 50000,
  requiresReviewFirst: true
};

export const GbpFixtureCapabilities: ProviderCapabilities = {
  providerId: 'google_business_profile',
  supportedActions: ['publish_post', 'propose_hours_update', 'fetch_reviews'],
  unsupportedActions: ['recurring_auto_publish', 'instant_phone_overwrite'],
  supportedMediaMimeTypes: ['image/jpeg', 'image/png'],
  maxMediaCount: 1,
  maxContentLength: 1500,
  requiresReviewFirst: true
};

export const MetaFixtureCapabilities: ProviderCapabilities = {
  providerId: 'meta',
  supportedActions: ['publish_photo', 'publish_carousel', 'read_insights'],
  unsupportedActions: ['publish_pdf', 'delete_user_comment'],
  supportedMediaMimeTypes: ['image/jpeg', 'image/png'],
  maxMediaCount: 10,
  maxContentLength: 2200,
  requiresReviewFirst: true
};

export const SearchConsoleFixtureCapabilities: ProviderCapabilities = {
  providerId: 'google_search_console',
  supportedActions: ['fetch_search_analytics', 'inspect_url'],
  unsupportedActions: ['publish_post', 'modify_sitemap'],
  supportedMediaMimeTypes: [],
  maxMediaCount: 0,
  maxContentLength: 0,
  requiresReviewFirst: false
};
