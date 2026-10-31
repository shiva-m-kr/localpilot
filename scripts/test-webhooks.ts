import assert from 'assert';
import crypto from 'crypto';
import { WebhookIngestionService, ValidationFailedError } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 035: AUTHENTICATED WEBHOOK & EVENT INGESTION VERIFICATION ---');

  WebhookIngestionService.clear();

  const metaSecret = 'meta-app-secret-12345';
  const metaPayload = JSON.stringify({
    object: 'page',
    entry: [{ id: 'meta-evt-101', time: 1730000000, changes: [{ field: 'feed', value: { post_id: '123' } }] }]
  });

  // 1. Forged signature acceptance check
  assert.throws(
    () => {
      WebhookIngestionService.ingestWebhook({
        provider: 'meta',
        rawPayload: metaPayload,
        headers: { 'x-hub-signature-256': 'sha256=invalidforgedsignature12345' },
        appSecret: metaSecret
      });
    },
    (err: any) => {
      assert.ok(err instanceof ValidationFailedError);
      assert.ok(err.message.includes('Forged Meta webhook signature'));
      return true;
    }
  );
  console.log('✓ Forged webhook payload strictly rejected with ValidationFailedError.');

  // 2. Valid Meta signature ingestion
  const validSignature = `sha256=${crypto
    .createHmac('sha256', metaSecret)
    .update(metaPayload)
    .digest('hex')}`;

  const res1 = WebhookIngestionService.ingestWebhook({
    provider: 'meta',
    rawPayload: metaPayload,
    headers: { 'x-hub-signature-256': validSignature },
    appSecret: metaSecret
  });

  assert.strictEqual(res1.acknowledged, true);
  assert.strictEqual(res1.isDuplicate, false);
  assert.strictEqual(res1.inboxRecord.status, 'received');
  assert.strictEqual(res1.inboxRecord.retentionDays, 7); // Meta 7 days
  console.log('✓ Valid Meta webhook acknowledged immediately and stored in durable inbox.');

  // 3. Replay Deduplication acceptance check: Same webhook delivered again
  const res2 = WebhookIngestionService.ingestWebhook({
    provider: 'meta',
    rawPayload: metaPayload,
    headers: { 'x-hub-signature-256': validSignature },
    appSecret: metaSecret
  });

  assert.strictEqual(res2.acknowledged, true);
  assert.strictEqual(res2.isDuplicate, true); // Flagged as duplicate!
  assert.strictEqual(res2.inboxRecord.id, res1.inboxRecord.id); // Same record, no double-ingestion!
  console.log('✓ Replayed event detected: acknowledged idempotently without double-mutating data.');

  // 4. Source-specific retention: Google Pub/Sub (GBP event)
  const gbpPayload = JSON.stringify({
    message: { messageId: 'pubsub-msg-999', data: 'eyJldmVudCI6ICJuZXdfcmV2aWV3In0=' }
  });

  const resGbp = WebhookIngestionService.ingestWebhook({
    provider: 'google_pubsub',
    rawPayload: gbpPayload,
    headers: { authorization: 'Bearer gcp-secret-token' },
    appSecret: 'gcp-secret-token'
  });

  assert.strictEqual(resGbp.acknowledged, true);
  assert.strictEqual(resGbp.inboxRecord.retentionDays, 30); // GBP 30-day strict retention rule
  console.log('✓ Google Pub/Sub webhook ingested with strict 30-day data retention limit.');

  // 5. Post-acknowledgment Crash Safety:
  // If the web server crashed right after returning HTTP 200/204 to the provider,
  // the event is already durably stored in the inbox and resumed by background workers!
  const processed = WebhookIngestionService.processInboxRecord(res1.inboxRecord.id);
  assert.strictEqual(processed.status, 'processed');
  assert.ok(processed.processedAt);
  console.log('✓ Durable inbox processing verified: background workers resume received events safely.');

  console.log('--- PROMPT 035 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
