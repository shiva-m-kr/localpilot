import assert from 'node:assert/strict';
import {
  SeoGovernanceService,
  SeoGovernanceStorage,
  RedirectRule,
  SiteIndexingConfig,
} from '@localpilot/domain';

async function runSeoGovernanceTests() {
  console.log('--- Testing Canonical, Sitemap and Robots Governance (Prompt 084) ---');

  const siteId = '11111111-2222-3333-4444-555555555555';
  const userId = '00000000-0000-0000-0000-000000000001';

  const publishedPages = [
    { slug: '/', updatedAt: '2026-10-25T10:00:00Z', isIndexable: true },
    { slug: '/services', updatedAt: '2026-10-26T12:00:00Z', isIndexable: true },
    { slug: '/about', updatedAt: '2026-10-27T14:00:00Z', isIndexable: true },
    { slug: '/secret-draft-staging', updatedAt: '2026-10-28T09:00:00Z', isIndexable: false }, // Should be excluded from sitemap!
  ];

  const redirectRules: RedirectRule[] = [];
  let currentConfig: SiteIndexingConfig = {
    siteId,
    allowIndexing: true,
    disallowedPaths: ['/api/', '/admin/', '/drafts/'],
    lastChangedAt: new Date().toISOString(),
    changedByUserId: userId,
  };
  const snapshotStore = new Map<string, SiteIndexingConfig>();

  const mockStorage: SeoGovernanceStorage = {
    async getSiteCanonicalBase(_id: string) {
      return 'https://apexplumbing.localpilot.site';
    },
    async getPublishedPages(_id: string) {
      return publishedPages;
    },
    async getRedirectRules(_id: string) {
      return redirectRules;
    },
    async saveRedirectRule(rule: RedirectRule) {
      redirectRules.push(rule);
    },
    async getIndexingConfig(_id: string) {
      return currentConfig;
    },
    async saveIndexingConfig(config: SiteIndexingConfig) {
      currentConfig = { ...config };
    },
    async saveIndexingSnapshot(snapshotId: string, config: SiteIndexingConfig) {
      snapshotStore.set(snapshotId, { ...config });
    },
    async getIndexingSnapshot(snapshotId: string) {
      return snapshotStore.get(snapshotId) || null;
    },
  };

  const service = new SeoGovernanceService(mockStorage);

  // Test 1: Sitemap XML generation
  console.log('Test 1: Sitemap XML includes only published indexable pages');
  const sitemap = await service.generateSitemapXml(siteId);
  assert.ok(sitemap.includes('<loc>https://apexplumbing.localpilot.site/</loc>'));
  assert.ok(sitemap.includes('<loc>https://apexplumbing.localpilot.site/services</loc>'));
  assert.ok(!sitemap.includes('secret-draft-staging'), 'Draft or non-indexable page must be excluded from sitemap!');

  // Test 2: Robots.txt generation
  console.log('Test 2: Robots.txt controls (NO "Noindex:" per Google guidelines)');
  const robots = await service.generateRobotsTxt(siteId);
  assert.ok(!robots.toLowerCase().includes('noindex'), 'robots.txt must NEVER write Noindex: directive!');
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Sitemap: https://apexplumbing.localpilot.site/sitemap.xml'));

  // Test 3: Redirect loop detection
  console.log('Test 3: Redirect loop detection');
  // 3a: Self redirect
  await assert.rejects(
    async () => {
      await service.addRedirectRule(siteId, '/services', '/services');
    },
    (err: any) => {
      assert.ok(err.message.includes('Self-redirect loop'));
      return true;
    }
  );

  // Add valid rule A -> B
  await service.addRedirectRule(siteId, '/old-pipe-repair', '/services/pipe-repair');
  // Attempt to add B -> A
  await assert.rejects(
    async () => {
      await service.addRedirectRule(siteId, '/services/pipe-repair', '/old-pipe-repair');
    },
    (err: any) => {
      assert.ok(err.message.includes('Redirect loop detected'));
      return true;
    }
  );

  // Test 4: Redirect resolution
  console.log('Test 4: Redirect resolution');
  const resolution = await service.resolveRedirect(siteId, '/old-pipe-repair');
  assert.equal(resolution?.targetPath, '/services/pipe-repair');
  assert.equal(resolution?.statusCode, '301');
  assert.equal(resolution?.hops, 1);

  // Test 5: Indexing toggle with rollback snapshot
  console.log('Test 5: Indexing change with snapshot rollback');
  const toggleResult = await service.toggleSiteIndexingWithRollback(siteId, false, userId);
  assert.equal(toggleResult.config.allowIndexing, false);

  const robotsAfterDisable = await service.generateRobotsTxt(siteId);
  assert.ok(robotsAfterDisable.includes('Disallow: /'));
  assert.ok(!robotsAfterDisable.toLowerCase().includes('noindex'));

  // Restore snapshot
  const restoredConfig = await service.rollbackSiteIndexing(siteId, toggleResult.snapshotId);
  assert.equal(restoredConfig.allowIndexing, true);

  // Test 6: Google Indexing API restriction
  console.log('Test 6: Google Indexing API restriction (rejects standard local/blog pages)');
  const rejectedSubmission = await service.submitToGoogleIndexingApi({
    url: 'https://apexplumbing.localpilot.site/blog/how-to-fix-leaks',
    pageType: 'BLOG_POST',
  });
  assert.equal(rejectedSubmission.isAllowed, false);
  assert.ok(rejectedSubmission.policyNote.includes('Google strictly restricts the Indexing API to JobPosting and BroadcastEvent'));

  const allowedSubmission = await service.submitToGoogleIndexingApi({
    url: 'https://apexplumbing.localpilot.site/careers/master-plumber-job',
    pageType: 'JOB_POSTING',
  });
  assert.equal(allowedSubmission.isAllowed, true);
  assert.equal(allowedSubmission.submitted, true);

  console.log('Prompt 084 verified successfully!\n');
}

runSeoGovernanceTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
