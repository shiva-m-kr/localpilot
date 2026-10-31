import assert from 'assert';
import crypto from 'crypto';
import { WordPressAdapter } from '@localpilot/integrations';
import { IdempotencyService, QueueService } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 030: WORDPRESS PUBLISH SPIKE VERIFICATION ---');

  const adapter = new WordPressAdapter();

  // 1. SSRF Protection: Insecure HTTP or Loopback rejected
  const insecureHealth = await adapter.validateConnection({
    siteUrl: 'http://insecure-site.com',
    username: 'admin',
    applicationPassword: 'pass'
  });
  assert.strictEqual(insecureHealth.healthy, false);
  assert.ok(insecureHealth.statusMessage.includes('must use secure HTTPS'));

  const ssrfHealth = await adapter.validateConnection({
    siteUrl: 'https://localhost:8080',
    username: 'admin',
    applicationPassword: 'pass'
  });
  assert.strictEqual(ssrfHealth.healthy, false);
  assert.ok(ssrfHealth.statusMessage.includes('SSRF blocked'));
  console.log('✓ Insecure HTTP and SSRF loopback endpoints strictly rejected.');

  // 2. Authorized Connection Validation
  const validCreds = {
    siteUrl: 'https://apexplumbing.example.com',
    username: 'localpilot_bot',
    applicationPassword: 'abcd efgh ijkl mnop'
  };

  const validHealth = await adapter.validateConnection(validCreds);
  assert.strictEqual(validHealth.healthy, true);
  assert.strictEqual(validHealth.status, 'connected');
  console.log('✓ Valid HTTPS WordPress connection with application password verified.');

  // 3. Publish test draft with media upload through adapter
  const payload = {
    itemId: '501',
    title: 'Winterization Checklist for Commercial Plumbing',
    content: '<p>Follow these essential checklist steps to prevent burst pipes during winter freeze.</p>',
    mediaUrls: ['https://media.localpilot.dev/photos/plumbing-valves.jpg'],
    mediaMimeTypes: ['image/jpeg']
  };

  const publishResult = await adapter.publish(validCreds, payload);
  assert.strictEqual(publishResult.providerId, 'wordpress');
  assert.strictEqual(publishResult.externalId, '501');
  assert.strictEqual(publishResult.publishedUrl, 'https://apexplumbing.example.com/?p=501');
  console.log('✓ Successfully published draft post with media attachment via WordPress REST adapter.');

  // 4. Update published post through adapter
  const updateResult = await adapter.updatePost(validCreds, '501', {
    title: 'Updated: Winterization Checklist 2026'
  });
  assert.strictEqual(updateResult.externalId, '501');
  console.log('✓ Successfully updated existing WordPress post.');

  // 5. Readback verification via reconcile()
  const recon = await adapter.reconcile(validCreds, '501');
  assert.strictEqual(recon.state, 'confirmed_published');
  assert.strictEqual(recon.publishedUrl, 'https://apexplumbing.example.com/?p=501');
  assert.ok(recon.notes?.includes('Updated: Winterization Checklist 2026'));
  console.log('✓ Reconciled and verified published post via GET readback.');

  // 6. Recovery scenario:
  // If media upload succeeds but post creation has an unknown outcome (e.g. timeout)
  // The system must NOT blindly retry POST. It classifies as AMBIGUOUS_EXTERNAL_WRITE
  // and relies on reconciliation to confirm status.
  const timeoutOutcome = IdempotencyService.classifyProviderOutcome(504, null, true);
  assert.strictEqual(timeoutOutcome.status, 'ambiguous');
  assert.strictEqual(timeoutOutcome.reconciliationRequired, true);

  const reconJobId = IdempotencyService.scheduleReconciliation(
    crypto.randomUUID(),
    'wp:post:501',
    'wordpress',
    '501'
  );
  assert.ok(reconJobId);
  console.log('✓ Ambiguous write recovery verified: post-upload timeout triggers automated reconciliation without blind retry.');

  console.log('--- PROMPT 030 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
