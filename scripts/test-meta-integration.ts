import assert from 'assert';
import { MetaAdapter } from '@localpilot/integrations';

async function runTest() {
  console.log('--- RUNNING PROMPT 033: META & INSTAGRAM INTEGRATION VERIFICATION ---');

  const adapter = new MetaAdapter();
  const creds = { userAccessToken: 'valid-meta-user-token', appMode: 'development' };

  // 1. Connection check with app-review status differentiation
  const health = await adapter.validateConnection(creds);
  assert.strictEqual(health.healthy, true);
  assert.ok(health.statusMessage.includes('Development Mode'));
  console.log('✓ App review mode honestly surfaced: developer-role mode not misrepresented as public SaaS access.');

  // 2. Discover Pages and Instagram Accounts
  const pages = await adapter.discoverPagesAndInstagramAccounts(creds);
  assert.strictEqual(pages.length, 2);

  const businessPage = pages[0];
  const personalPage = pages[1];

  assert.strictEqual(businessPage.isEligibleForPublishing, true);
  assert.strictEqual(businessPage.instagramAccountType, 'BUSINESS');

  assert.strictEqual(personalPage.isEligibleForPublishing, false);
  assert.strictEqual(personalPage.instagramAccountType, 'PERSONAL');
  assert.ok(personalPage.ineligibilityReason?.includes('requires an Instagram Professional'));
  console.log('✓ Discovered Pages: personal Instagram account flagged ineligible with clear guidance.');

  // 3. Publishing to unselected page rejected
  await assert.rejects(
    async () => {
      await adapter.publish(creds, {
        itemId: 'post-1',
        title: 'New Service',
        content: 'Emergency calls welcome',
        mediaUrls: [],
        mediaMimeTypes: [],
        pageId: businessPage.pageId
      } as any);
    },
    (err: any) => {
      assert.ok(err.message.includes('asset has not been selected by tenant'));
      return true;
    }
  );
  console.log('✓ Enforced tenant asset selection check before publishing.');

  // 4. Ineligible personal account publishing rejected
  adapter.setAssetSelection(personalPage.pageId, true);
  await assert.rejects(
    async () => {
      await adapter.publish(creds, {
        itemId: 'post-2',
        title: 'Personal update',
        content: 'Check this out',
        mediaUrls: [],
        mediaMimeTypes: [],
        pageId: personalPage.pageId,
        channel: 'instagram'
      } as any);
    },
    (err: any) => {
      assert.ok(err.message.includes('requires an Instagram Professional'));
      return true;
    }
  );
  console.log('✓ Prevented Instagram publishing to ineligible personal accounts with actionable guidance.');

  // 5. Authorized Business Page Publish
  adapter.setAssetSelection(businessPage.pageId, true);
  const publishResult = await adapter.publish(creds, {
    itemId: 'post-3',
    title: 'Frozen Pipe Prevention',
    content: 'Tips from licensed plumbers in Toronto',
    mediaUrls: ['https://example.com/img.jpg'],
    mediaMimeTypes: ['image/jpeg'],
    pageId: businessPage.pageId,
    channel: 'facebook'
  } as any);

  assert.strictEqual(publishResult.providerId, 'meta');
  assert.ok(publishResult.publishedUrl.includes(businessPage.pageId));
  console.log('✓ Published successfully to authorized Facebook Page.');

  console.log('--- PROMPT 033 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
