import {
  ProviderAdapter,
  ProviderCapabilities,
  ConnectionHealth,
  PublishablePayload,
  PublishResult,
  ReconcileResult,
  EvidenceRecord
} from '../adapter.js';
import { GbpFixtureCapabilities } from '../fixtures.js';

export interface GbpDiscoveredLocation {
  accountId: string;
  locationId: string; // e.g. "locations/10928374"
  locationTitle: string;
  storeCode?: string;
  formattedAddress: string;
  verificationStatus: 'VERIFIED' | 'NEEDS_VERIFICATION' | 'SUSPENDED';
  isAuthorizedByTenant: boolean;
  canPublishPosts: boolean;
  canManageReviews: boolean;
}

export class GbpAdapter implements ProviderAdapter {
  readonly providerId = 'google_business_profile';

  private static mockLocations: GbpDiscoveredLocation[] = [
    {
      accountId: 'accounts/101',
      locationId: 'locations/10928374',
      locationTitle: 'Apex Plumbing & HVAC - Downtown',
      storeCode: 'DWTN-01',
      formattedAddress: '100 King St W, Toronto, ON M5X 1A9',
      verificationStatus: 'VERIFIED',
      isAuthorizedByTenant: false,
      canPublishPosts: true,
      canManageReviews: true
    },
    {
      accountId: 'accounts/101',
      locationId: 'locations/88273641',
      locationTitle: 'Apex Plumbing - East York Depot',
      storeCode: 'EY-02',
      formattedAddress: '450 Pape Ave, Toronto, ON M4K 3P7',
      verificationStatus: 'NEEDS_VERIFICATION',
      isAuthorizedByTenant: false,
      canPublishPosts: false, // Cannot publish while unverified!
      canManageReviews: false
    }
  ];

  getCapabilities(): ProviderCapabilities {
    return GbpFixtureCapabilities;
  }

  async validateConnection(creds: Record<string, string>): Promise<ConnectionHealth> {
    if (!creds.accessToken) {
      return {
        healthy: false,
        status: 'reconnect_required',
        lastCheckedAt: new Date().toISOString(),
        statusMessage: 'GBP OAuth token is missing or expired.'
      };
    }
    return {
      healthy: true,
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
      statusMessage: 'GBP connection authorized.'
    };
  }

  /**
   * Discovers accounts and locations accessible by the authorized Google user.
   */
  async discoverLocations(creds: Record<string, string>): Promise<GbpDiscoveredLocation[]> {
    const health = await this.validateConnection(creds);
    if (!health.healthy) {
      throw new Error(`Cannot discover GBP locations: ${health.statusMessage}`);
    }
    return GbpAdapter.mockLocations;
  }

  /**
   * Publishes a local post to an authorized and selected location.
   */
  async publish(creds: Record<string, string>, payload: PublishablePayload): Promise<PublishResult> {
    const health = await this.validateConnection(creds);
    if (!health.healthy) throw new Error(health.statusMessage);

    const targetLocationId = (payload as any).locationId || 'locations/10928374';
    const loc = GbpAdapter.mockLocations.find((l) => l.locationId === targetLocationId);

    if (!loc) {
      throw new Error(`Location ${targetLocationId} not found in GBP account.`);
    }

    if (loc.verificationStatus !== 'VERIFIED') {
      throw new Error(
        `Cannot publish to location ${targetLocationId}: location verification status is ${loc.verificationStatus}. Verification required.`
      );
    }

    if (!loc.isAuthorizedByTenant) {
      throw new Error(
        `Cannot act on location ${targetLocationId}: location has not been selected and authorized by the tenant.`
      );
    }

    return {
      providerId: 'google_business_profile',
      externalId: `gbp-post-${payload.itemId}`,
      publishedUrl: `https://business.google.com/posts/l/${targetLocationId}`,
      publishedAt: new Date().toISOString(),
      rawResponseSummary: `Post published to ${loc.locationTitle}`
    };
  }

  /**
   * Explicitly sets tenant selection for an authorized location.
   */
  setLocationAuthorization(locationId: string, authorized: boolean): void {
    const loc = GbpAdapter.mockLocations.find((l) => l.locationId === locationId);
    if (loc) {
      loc.isAuthorizedByTenant = authorized;
    }
  }

  async reconcile(creds: Record<string, string>, externalId: string): Promise<ReconcileResult> {
    return {
      providerId: 'google_business_profile',
      externalId,
      state: 'confirmed_published',
      publishedUrl: `https://business.google.com/posts/${externalId}`,
      observedAt: new Date().toISOString(),
      notes: 'GBP local post verified on location profile.'
    };
  }

  async fetchEvidence(creds: Record<string, string>, query: Record<string, unknown>): Promise<EvidenceRecord[]> {
    return [
      {
        source: 'google_business_profile',
        metricName: 'direct_phone_calls',
        value: 28,
        observedAt: new Date().toISOString(),
        windowDays: 30
      },
      {
        source: 'google_business_profile',
        metricName: 'driving_directions_requests',
        value: 46,
        observedAt: new Date().toISOString(),
        windowDays: 30
      }
    ];
  }
}
