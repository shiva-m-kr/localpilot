import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BaseProviderAdapter,
  WordPressFixtureCapabilities
} from '@localpilot/integrations';
import {
  ProviderRegistry,
  CapabilityService,
  ReconnectRequiredError,
  UnsupportedActionError
} from '@localpilot/domain';
import { ConnectionCapabilityCard } from '@localpilot/ui';

async function runTest() {
  console.log('--- RUNNING PROMPT 034: CAPABILITY-AWARE INTEGRATION UX VERIFICATION ---');

  CapabilityService.clear();

  const wpAdapter = new BaseProviderAdapter('wordpress', WordPressFixtureCapabilities);
  ProviderRegistry.register(wpAdapter);

  // 1. Initial snapshot: WordPress is connected
  const creds = { siteUrl: 'https://apexplumbing.example.com', apiKey: 'valid-key' };
  const reportConnected = await CapabilityService.getCapabilityReport('wordpress', creds);

  assert.strictEqual(reportConnected.status, 'connected');
  assert.ok(reportConnected.supportedActions.includes('publish_post'));
  // Connected does NOT imply every action works!
  assert.ok(reportConnected.blockedActions.includes('edit_robots_txt'));
  console.log('✓ Connected status truthfully exposes supported vs blocked actions.');

  // 2. Render UI Card
  const markup = renderToStaticMarkup(
    React.createElement(ConnectionCapabilityCard, {
      providerName: 'WordPress Engine',
      providerId: 'wordpress',
      isConnected: true,
      isReconnectRequired: false,
      statusMessage: 'Connected and authenticated.',
      supportedActions: reportConnected.supportedActions,
      blockedActions: reportConnected.blockedActions
    })
  );

  assert.ok(markup.includes('CONNECTED'));
  assert.ok(markup.includes('publish_post'));
  assert.ok(markup.includes('edit_robots_txt (Disabled)'));
  console.log('✓ UI card surfaces supported capabilities and explicitly marks disabled actions.');

  // 3. Pre-write Live Verification:
  // Suppose an earlier UI snapshot showed active connection, but between then and the write,
  // credentials were revoked by the remote provider!
  const revokedCreds = { siteUrl: 'https://apexplumbing.example.com' }; // Missing apiKey!

  await assert.rejects(
    async () => {
      await CapabilityService.verifyBeforeWrite('wordpress', revokedCreds, 'publish_post');
    },
    (err: any) => {
      assert.ok(err instanceof ReconnectRequiredError);
      return true;
    }
  );
  console.log('✓ Pre-write check strictly prevents publication when credentials are revoked, ignoring stale UI snapshots.');

  // 4. Pre-write Unsupported Action Check
  await assert.rejects(
    async () => {
      await CapabilityService.verifyBeforeWrite('wordpress', creds, 'edit_robots_txt');
    },
    (err: any) => {
      assert.ok(err instanceof UnsupportedActionError);
      return true;
    }
  );
  console.log('✓ Pre-write check blocks unsupported actions with UnsupportedActionError.');

  console.log('--- PROMPT 034 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
