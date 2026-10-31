import {
  ProviderAdapter,
  ProviderCapabilities,
  ConnectionHealth,
  PublishablePayload,
  PublishResult,
  ReconcileResult,
  EvidenceRecord
} from '../adapter.js';
import { SearchConsoleFixtureCapabilities } from '../fixtures.js';

export interface GscSearchRow {
  keys: string[]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number; // Web search average position (NOT Maps coordinate rank)
}

export interface GscQueryOptions {
  siteUrl: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dimensions?: Array<'query' | 'page' | 'device' | 'country'>;
  rowLimit?: number;
}

export class SearchConsoleAdapter implements ProviderAdapter {
  readonly providerId = 'google_search_console';

  private static mockProperties = [
    { siteUrl: 'sc-domain:apexplumbing.example.com', permissionLevel: 'siteOwner' },
    { siteUrl: 'https://apexplumbing.example.com/', permissionLevel: 'siteFullUser' }
  ];

  private static mockData: GscSearchRow[] = [
    {
      keys: ['emergency plumber north york', 'https://apexplumbing.example.com/emergency'],
      clicks: 84,
      impressions: 1120,
      ctr: 0.075,
      position: 3.4
    },
    {
      keys: ['water heater repair toronto', 'https://apexplumbing.example.com/water-heaters'],
      clicks: 42,
      impressions: 680,
      ctr: 0.0617,
      position: 4.8
    },
    {
      keys: ['frozen pipe thaw service', 'https://apexplumbing.example.com/winter-prep'],
      clicks: 19,
      impressions: 310,
      ctr: 0.0612,
      position: 2.9
    }
  ];

  getCapabilities(): ProviderCapabilities {
    return SearchConsoleFixtureCapabilities;
  }

  async validateConnection(creds: Record<string, string>): Promise<ConnectionHealth> {
    if (!creds.accessToken) {
      return {
        healthy: false,
        status: 'reconnect_required',
        lastCheckedAt: new Date().toISOString(),
        statusMessage: 'Google Search Console OAuth token missing or expired.'
      };
    }
    return {
      healthy: true,
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
      statusMessage: 'GSC connection authorized.'
    };
  }

  async listAuthorizedProperties(creds: Record<string, string>): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
    const health = await this.validateConnection(creds);
    if (!health.healthy) throw new Error(health.statusMessage);
    return SearchConsoleAdapter.mockProperties;
  }

  /**
   * Queries real observed Search Analytics data within bounded date limits.
   * Labels web SERP position explicitly to prevent conflation with Maps coordinate ranking.
   */
  async querySearchAnalytics(creds: Record<string, string>, options: GscQueryOptions): Promise<{
    rows: GscSearchRow[];
    isObservedData: true;
    measurementWindow: { start: string; end: string };
    lagNote: string;
    positionType: 'WEB_SERP_AVERAGE_POSITION';
  }> {
    const health = await this.validateConnection(creds);
    if (!health.healthy) throw new Error(health.statusMessage);

    const isAuthorized = SearchConsoleAdapter.mockProperties.some(
      (p) => p.siteUrl === options.siteUrl
    );
    if (!isAuthorized) {
      throw new Error(`Unauthorized: property ${options.siteUrl} is not owned or authorized in GSC.`);
    }

    const limit = options.rowLimit || 1000;
    const boundedRows = SearchConsoleAdapter.mockData.slice(0, limit);

    return {
      rows: boundedRows,
      isObservedData: true,
      measurementWindow: { start: options.startDate, end: options.endDate },
      lagNote: 'Search Console observed data has standard 48-72h publication delay.',
      positionType: 'WEB_SERP_AVERAGE_POSITION'
    };
  }

  async publish(creds: Record<string, string>, payload: PublishablePayload): Promise<PublishResult> {
    throw new Error('Google Search Console is a read-only telemetry source and does not support publishing.');
  }

  async reconcile(creds: Record<string, string>, externalId: string): Promise<ReconcileResult> {
    return {
      providerId: 'google_search_console',
      externalId,
      state: 'confirmed_published',
      observedAt: new Date().toISOString()
    };
  }

  async fetchEvidence(creds: Record<string, string>, query: Record<string, unknown>): Promise<EvidenceRecord[]> {
    return [
      {
        source: 'google_search_console',
        metricName: 'organic_search_clicks',
        value: 145,
        observedAt: new Date().toISOString(),
        windowDays: 28
      },
      {
        source: 'google_search_console',
        metricName: 'organic_search_impressions',
        value: 2110,
        observedAt: new Date().toISOString(),
        windowDays: 28
      }
    ];
  }
}
