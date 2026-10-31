import {
  ProviderAdapter,
  ProviderCapabilities,
  ConnectionHealth,
  PublishablePayload,
  PublishResult,
  ReconcileResult,
  EvidenceRecord
} from '../adapter.js';
import { MetaFixtureCapabilities } from '../fixtures.js';

export interface MetaPageAsset {
  pageId: string;
  pageName: string;
  category: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  instagramAccountType?: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
  isEligibleForPublishing: boolean;
  ineligibilityReason?: string;
  isSelectedByTenant: boolean;
}

export class MetaAdapter implements ProviderAdapter {
  readonly providerId = 'meta';

  private static mockPages: MetaPageAsset[] = [
    {
      pageId: '1092837492019',
      pageName: 'Apex Plumbing Toronto',
      category: 'Plumbing Service',
      instagramAccountId: '17841400123456789',
      instagramUsername: 'apexplumbingto',
      instagramAccountType: 'BUSINESS',
      isEligibleForPublishing: true,
      isSelectedByTenant: false
    },
    {
      pageId: '2093847501928',
      pageName: 'Shivam Personal Blog',
      category: 'Personal Blog',
      instagramAccountId: '17841400999999999',
      instagramUsername: 'shivam_personal',
      instagramAccountType: 'PERSONAL', // Personal IG accounts are ineligible for Graph API publishing!
      isEligibleForPublishing: false,
      ineligibilityReason: 'Instagram Graph API requires an Instagram Professional (Business or Creator) account linked to this Facebook Page.',
      isSelectedByTenant: false
    }
  ];

  getCapabilities(): ProviderCapabilities {
    return MetaFixtureCapabilities;
  }

  async validateConnection(creds: Record<string, string>): Promise<ConnectionHealth> {
    if (!creds.userAccessToken) {
      return {
        healthy: false,
        status: 'reconnect_required',
        lastCheckedAt: new Date().toISOString(),
        statusMessage: 'Meta user access token missing or expired.'
      };
    }

    // App review state verification
    const isAppInDevMode = creds.appMode === 'development';
    return {
      healthy: true,
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
      statusMessage: isAppInDevMode
        ? 'Connected in Meta Development Mode (Test accounts only).'
        : 'Connected in Meta Live Approved Mode.'
    };
  }

  async discoverPagesAndInstagramAccounts(creds: Record<string, string>): Promise<MetaPageAsset[]> {
    const health = await this.validateConnection(creds);
    if (!health.healthy) throw new Error(health.statusMessage);
    return MetaAdapter.mockPages;
  }

  setAssetSelection(pageId: string, selected: boolean): void {
    const page = MetaAdapter.mockPages.find((p) => p.pageId === pageId);
    if (page) {
      page.isSelectedByTenant = selected;
    }
  }

  async publish(creds: Record<string, string>, payload: PublishablePayload): Promise<PublishResult> {
    const health = await this.validateConnection(creds);
    if (!health.healthy) throw new Error(health.statusMessage);

    const targetPageId = (payload as any).pageId || '1092837492019';
    const page = MetaAdapter.mockPages.find((p) => p.pageId === targetPageId);

    if (!page) {
      throw new Error(`Facebook Page ${targetPageId} not found in Meta account.`);
    }

    if (!page.isSelectedByTenant) {
      throw new Error(`Cannot publish to page ${targetPageId}: asset has not been selected by tenant.`);
    }

    if ((payload as any).channel === 'instagram') {
      if (!page.isEligibleForPublishing || page.instagramAccountType === 'PERSONAL') {
        throw new Error(
          `Cannot publish to Instagram: ${page.ineligibilityReason || 'Account is not an eligible Professional Instagram account.'}`
        );
      }
    }

    return {
      providerId: 'meta',
      externalId: `meta-post-${payload.itemId}`,
      publishedUrl: `https://www.facebook.com/${targetPageId}/posts/${payload.itemId}`,
      publishedAt: new Date().toISOString(),
      rawResponseSummary: `Published to Meta page "${page.pageName}"`
    };
  }

  async reconcile(creds: Record<string, string>, externalId: string): Promise<ReconcileResult> {
    return {
      providerId: 'meta',
      externalId,
      state: 'confirmed_published',
      publishedUrl: `https://www.facebook.com/posts/${externalId}`,
      observedAt: new Date().toISOString()
    };
  }

  async fetchEvidence(creds: Record<string, string>, query: Record<string, unknown>): Promise<EvidenceRecord[]> {
    return [
      {
        source: 'meta',
        metricName: 'page_post_engagements',
        value: 230,
        observedAt: new Date().toISOString(),
        windowDays: 28
      }
    ];
  }
}
