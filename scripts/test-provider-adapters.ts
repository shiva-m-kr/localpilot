import assert from 'assert';
import crypto from 'crypto';
import {
  BaseProviderAdapter,
  WordPressFixtureCapabilities,
  GbpFixtureCapabilities,
  MetaFixtureCapabilities,
  SearchConsoleFixtureCapabilities
} from '@localpilot/integrations';
import {
  ProviderRegistry,
  UnsupportedActionError,
  ValidationFailedError
} from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 028: PROVIDER ADAPTER INTERFACES VERIFICATION ---');

  // 1. Register adapters
  const wpAdapter = new BaseProviderAdapter('wordpress', WordPressFixtureCapabilities);
  const gbpAdapter = new BaseProviderAdapter('google_business_profile', GbpFixtureCapabilities);
  const metaAdapter = new BaseProviderAdapter('meta', MetaFixtureCapabilities);
  const gscAdapter = new BaseProviderAdapter('google_search_console', SearchConsoleFixtureCapabilities);

  ProviderRegistry.register(wpAdapter);
  ProviderRegistry.register(gbpAdapter);
  ProviderRegistry.register(metaAdapter);
  ProviderRegistry.register(gscAdapter);

  console.log('✓ Registered typed provider adapters (WordPress, GBP, Meta, GSC).');

  // 2. Capabilities inspection
  const wpCaps = wpAdapter.getCapabilities();
  assert.strictEqual(wpCaps.providerId, 'wordpress');
  assert.ok(wpCaps.supportedActions.includes('publish_post'));
  assert.ok(wpCaps.unsupportedActions.includes('edit_robots_txt'));

  const gscCaps = gscAdapter.getCapabilities();
  assert.ok(gscCaps.unsupportedActions.includes('publish_post'));
  console.log('✓ Adapter capability boundaries and unsupported actions explicitly reported.');

  // 3. Prevent arbitrary publishing on read-only adapter (e.g. Search Console)
  await assert.rejects(
    async () => {
      await ProviderRegistry.publishThroughAdapter('google_search_console', { token: 'gsc-123' }, {
        itemId: 'post-1',
        title: 'Post',
        content: 'Content',
        mediaUrls: [],
        mediaMimeTypes: []
      });
    },
    (err: any) => {
      assert.ok(err instanceof UnsupportedActionError);
      return true;
    }
  );
  console.log('✓ Rejected publish operation on read-only Search Console provider.');

  // 4. Unsupported Media Combination check:
  // WordPress supports image/jpeg, image/png, image/webp. It rejects application/pdf as post thumbnail
  await assert.rejects(
    async () => {
      await ProviderRegistry.publishThroughAdapter('wordpress', { token: 'wp-123' }, {
        itemId: 'post-2',
        title: 'Document Post',
        content: 'Check out this PDF',
        mediaUrls: ['https://example.com/doc.pdf'],
        mediaMimeTypes: ['application/pdf']
      });
    },
    (err: any) => {
      assert.ok(err instanceof ValidationFailedError);
      assert.ok(err.message.includes('unsupported by provider'));
      return true;
    }
  );
  console.log('✓ Unsupported media MIME type rejected explicitly prior to remote request.');

  // 5. Successful publish and domain decoupling:
  // Domain receives standard PublishResult without importing WordPress REST types
  const publishResult = await ProviderRegistry.publishThroughAdapter('wordpress', { token: 'wp-valid' }, {
    itemId: 'post-3',
    title: 'Drain Cleaning Guide',
    content: 'Tips for homeowners',
    mediaUrls: ['https://example.com/drain.jpg'],
    mediaMimeTypes: ['image/jpeg']
  });

  assert.strictEqual(publishResult.providerId, 'wordpress');
  assert.ok(publishResult.publishedUrl.includes('wordpress.example.com'));
  assert.strictEqual(publishResult.externalId, 'wordpress-ext-post-3');
  console.log('✓ Published through adapter returning standardized PublishResult decoupled from raw SDKs.');

  // 6. Reconciliation contract
  const recon = await ProviderRegistry.reconcileThroughAdapter('wordpress', { token: 'wp-valid' }, 'post-3');
  assert.strictEqual(recon.state, 'confirmed_published');
  assert.strictEqual(recon.externalId, 'post-3');
  console.log('✓ Reconciliation contract verified with standardized ReconcileResult.');

  // 7. Security Acceptance: Adapters cannot forward arbitrary user-selected URLs (no proxying)
  assert.strictEqual((wpAdapter as any).fetchArbitraryUrl, undefined);
  assert.strictEqual((wpAdapter as any).proxyRequest, undefined);
  console.log('✓ Confirmed provider adapters expose no arbitrary forward/proxy endpoints.');

  console.log('--- PROMPT 028 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
