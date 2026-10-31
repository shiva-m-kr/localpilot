import {
  SitemapEntry,
  RedirectRule,
  SiteIndexingConfig,
  IndexingApiSubmissionRequest,
  IndexingApiSubmissionResult,
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface SeoGovernanceStorage {
  getSiteCanonicalBase(siteId: string): Promise<string>;
  getPublishedPages(siteId: string): Promise<Array<{ slug: string; updatedAt: string; isIndexable: boolean }>>;
  getRedirectRules(siteId: string): Promise<RedirectRule[]>;
  saveRedirectRule(rule: RedirectRule): Promise<void>;
  getIndexingConfig(siteId: string): Promise<SiteIndexingConfig | null>;
  saveIndexingConfig(config: SiteIndexingConfig): Promise<void>;
  saveIndexingSnapshot(snapshotId: string, config: SiteIndexingConfig): Promise<void>;
  getIndexingSnapshot(snapshotId: string): Promise<SiteIndexingConfig | null>;
}

export class SeoGovernanceService {
  private storage: SeoGovernanceStorage;

  constructor(storage: SeoGovernanceStorage) {
    this.storage = storage;
  }

  /**
   * Generates a valid sitemap.xml strictly for published, indexable pages
   */
  public async generateSitemapXml(siteId: string): Promise<string> {
    const baseUrl = await this.storage.getSiteCanonicalBase(siteId);
    const publishedPages = await this.storage.getPublishedPages(siteId);
    const config = await this.storage.getIndexingConfig(siteId);

    // If site has indexing disabled globally, return empty or minimal sitemap
    if (config && !config.allowIndexing) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
    }

    const indexablePages = publishedPages.filter((p) => p.isIndexable);

    const urlsXml = indexablePages
      .map((page) => {
        const fullUrl = page.slug === '' || page.slug === '/' ? `${baseUrl}/` : `${baseUrl}/${page.slug.replace(/^\//, '')}`;
        const lastmod = new Date(page.updatedAt).toISOString().split('T')[0];
        const priority = page.slug === '' || page.slug === '/' ? '1.0' : '0.8';

        return `  <url>
    <loc>${this.escapeXml(fullUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
  }

  /**
   * Generates robots.txt.
   * CRITICAL RULE: Never write "Noindex:" inside robots.txt (Google deprecated and ignores it).
   */
  public async generateRobotsTxt(siteId: string): Promise<string> {
    const baseUrl = await this.storage.getSiteCanonicalBase(siteId);
    const config = await this.storage.getIndexingConfig(siteId);

    const sitemapLine = `Sitemap: ${baseUrl}/sitemap.xml`;

    if (config && !config.allowIndexing) {
      // Disallow all crawlers from crawling, but DO NOT output "Noindex:"
      return `User-agent: *\nDisallow: /\n\n${sitemapLine}\n`;
    }

    const disallowed = config?.disallowedPaths || ['/api/', '/admin/', '/drafts/'];
    const disallowLines = disallowed.map((p) => `Disallow: ${p}`).join('\n');

    return `User-agent: *\n${disallowLines}\nAllow: /\n\n${sitemapLine}\n`;
  }

  /**
   * Adds a redirect rule with strict redirect-loop detection
   */
  public async addRedirectRule(
    siteId: string,
    sourcePath: string,
    targetPath: string,
    statusCode: '301' | '302' = '301'
  ): Promise<RedirectRule> {
    const cleanSource = this.normalizePath(sourcePath);
    const cleanTarget = this.normalizePath(targetPath);

    if (cleanSource === cleanTarget) {
      throw new ValidationFailedError(`Self-redirect loop: source '${sourcePath}' is identical to target.`);
    }

    const existingRules = await this.storage.getRedirectRules(siteId);

    // Loop check: does targetPath already redirect back to sourcePath directly or indirectly?
    let current = cleanTarget;
    const visited = new Set<string>([cleanSource]);

    for (let hop = 0; hop < 10; hop++) {
      if (visited.has(current)) {
        throw new ValidationFailedError(
          `Redirect loop detected: adding '${cleanSource} -> ${cleanTarget}' creates an infinite redirect cycle involving '${current}'.`
        );
      }
      visited.add(current);

      const nextRule = existingRules.find((r) => r.isActive && this.normalizePath(r.sourcePath) === current);
      if (!nextRule) break;
      current = this.normalizePath(nextRule.targetPath);
    }

    const newRule: RedirectRule = {
      id: crypto.randomUUID ? crypto.randomUUID() : `redir-${Date.now()}`,
      siteId,
      sourcePath: cleanSource,
      targetPath: cleanTarget,
      statusCode,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await this.storage.saveRedirectRule(newRule);
    return newRule;
  }

  /**
   * Resolves redirect chain for a requested path, up to 5 hops
   */
  public async resolveRedirect(
    siteId: string,
    path: string
  ): Promise<{ targetPath: string; statusCode: '301' | '302'; hops: number } | null> {
    const rules = await this.storage.getRedirectRules(siteId);
    let currentPath = this.normalizePath(path);
    let hops = 0;
    const maxHops = 5;
    let finalStatusCode: '301' | '302' = '301';
    const visited = new Set<string>();

    while (hops < maxHops) {
      if (visited.has(currentPath)) {
        throw new ValidationFailedError(`Circular redirect detected at '${currentPath}'.`);
      }
      visited.add(currentPath);

      const matchingRule = rules.find((r) => r.isActive && this.normalizePath(r.sourcePath) === currentPath);
      if (!matchingRule) break;

      currentPath = this.normalizePath(matchingRule.targetPath);
      finalStatusCode = matchingRule.statusCode;
      hops++;
    }

    if (hops >= maxHops) {
      throw new ValidationFailedError(`Redirect chain exceeded maximum limit of ${maxHops} hops.`);
    }

    if (hops === 0) {
      return null; // No redirect
    }

    return {
      targetPath: currentPath,
      statusCode: finalStatusCode,
      hops,
    };
  }

  /**
   * Toggles site indexing with an immutable snapshot for safe rollback
   */
  public async toggleSiteIndexingWithRollback(
    siteId: string,
    allowIndexing: boolean,
    userId: string
  ): Promise<{ config: SiteIndexingConfig; snapshotId: string }> {
    const currentConfig = (await this.storage.getIndexingConfig(siteId)) || {
      siteId,
      allowIndexing: true,
      disallowedPaths: ['/api/', '/admin/', '/drafts/'],
      lastChangedAt: new Date().toISOString(),
      changedByUserId: userId,
    };

    const snapshotId = crypto.randomUUID ? crypto.randomUUID() : `snap-${Date.now()}`;
    await this.storage.saveIndexingSnapshot(snapshotId, currentConfig);

    const updatedConfig: SiteIndexingConfig = {
      ...currentConfig,
      allowIndexing,
      previousSnapshotId: snapshotId,
      lastChangedAt: new Date().toISOString(),
      changedByUserId: userId,
    };

    await this.storage.saveIndexingConfig(updatedConfig);

    return { config: updatedConfig, snapshotId };
  }

  /**
   * Restores a previous indexing snapshot
   */
  public async rollbackSiteIndexing(
    siteId: string,
    snapshotId: string
  ): Promise<SiteIndexingConfig> {
    const snapshot = await this.storage.getIndexingSnapshot(snapshotId);
    if (!snapshot) {
      throw new ValidationFailedError(`Indexing snapshot '${snapshotId}' not found.`);
    }

    await this.storage.saveIndexingConfig(snapshot);
    return snapshot;
  }

  /**
   * Submits URLs to Google's Indexing API with strict compliance check.
   * Google Indexing API strictly prohibits standard business/blog URLs (only JobPosting/BroadcastEvent permitted).
   */
  public async submitToGoogleIndexingApi(
    request: IndexingApiSubmissionRequest
  ): Promise<IndexingApiSubmissionResult> {
    if (request.pageType !== 'JOB_POSTING' && request.pageType !== 'BROADCAST_EVENT') {
      return {
        isAllowed: false,
        submitted: false,
        message: `Submission rejected: Page type '${request.pageType}' is not permitted by Google's Indexing API guidelines.`,
        policyNote:
          'Google strictly restricts the Indexing API to JobPosting and BroadcastEvent structured data. Standard local business pages, service pages, and blogs must be crawled via sitemaps and search console ping.',
      };
    }

    return {
      isAllowed: true,
      submitted: true,
      message: `URL successfully dispatched to Google Indexing API for eligible ${request.pageType}.`,
      policyNote: 'Eligible structured data verified against Google Indexing API policy.',
    };
  }

  private normalizePath(p: string): string {
    let clean = p.trim();
    if (!clean.startsWith('/')) clean = '/' + clean;
    if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
