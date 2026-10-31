import { randomUUID } from 'crypto';
import assert from 'assert';
import { MetaPublishPipeline, MetaPublishRequest } from '../packages/domain/src/metaPublishPipeline.js';
import { ReconnectRequiredError, ValidationFailedError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 049: Add supported Instagram and Facebook publishing...');

  MetaPublishPipeline.reset();
  const orgId = randomUUID();
  const locId = randomUUID();
  const variantId = randomUUID();

  // 1. Instagram requires media URL
  assert.rejects(
    async () => {
      await MetaPublishPipeline.executePublish({
        organizationId: orgId,
        locationId: locId,
        variantId,
        platform: 'INSTAGRAM',
        targetAccountId: '17841400123456789',
        message: 'Great roofing tips for summer.',
        accessToken: 'valid-meta-token'
        // Missing mediaUrl!
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Instagram publishing without media URL must fail'
  );
  console.log('✓ Instagram media requirement enforced deterministically');

  // 2. Reject internal SSRF media URLs
  assert.rejects(
    async () => {
      await MetaPublishPipeline.executePublish({
        organizationId: orgId,
        locationId: locId,
        variantId,
        platform: 'INSTAGRAM',
        targetAccountId: '17841400123456789',
        message: 'Roofing project photo.',
        mediaUrl: 'http://169.254.169.254/secret-image.png',
        accessToken: 'valid-meta-token'
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'SSRF media URL must be blocked'
  );
  console.log('✓ Insecure / SSRF media URLs blocked from Instagram fetch');

  // 3. Reject pretending Instagram caption links are clickable
  assert.rejects(
    async () => {
      await MetaPublishPipeline.executePublish({
        organizationId: orgId,
        locationId: locId,
        variantId,
        platform: 'INSTAGRAM',
        targetAccountId: '17841400123456789',
        message: 'Click this link https://apexroofing.example.com/quote to book your repair!',
        mediaUrl: 'https://images.example.com/roof.jpg',
        accessToken: 'valid-meta-token'
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Clickable caption link claims must be rejected'
  );
  console.log('✓ Prevented deceptive "clickable link" claims in Instagram captions');

  // 4. Revoked permission creates reconnect required error
  assert.rejects(
    async () => {
      await MetaPublishPipeline.executePublish({
        organizationId: orgId,
        locationId: locId,
        variantId,
        platform: 'FACEBOOK',
        targetAccountId: '1092837492019',
        message: 'Storm restoration tips for Austin homeowners.',
        accessToken: 'expired-token',
        isTokenRevoked: true
      });
    },
    (err: any) => err instanceof ReconnectRequiredError,
    'Revoked token must throw ReconnectRequiredError'
  );
  console.log('✓ Revoked permissions trigger ReconnectRequiredError for reconnect tasks');

  // 5. Authorized Instagram publish with container processing and readback
  const igReq: MetaPublishRequest = {
    organizationId: orgId,
    locationId: locId,
    variantId,
    platform: 'INSTAGRAM',
    targetAccountId: '17841400123456789',
    message: 'Finished commercial TPO membrane install in North Austin. Tap link in bio for full project gallery. #austinroofing',
    mediaUrl: 'https://cdn.example.com/assets/tpo-roof.jpg',
    accessToken: 'valid-user-token'
  };

  const igOutcome = await MetaPublishPipeline.executePublish(igReq);
  assert(igOutcome.externalId);
  assert(igOutcome.containerId);
  assert.strictEqual(igOutcome.verifiedViaReadback, true);
  assert.strictEqual(igOutcome.isDuplicateCall, false);
  console.log(`✓ Instagram container processed, published, and verified via readback (ID: ${igOutcome.externalId})`);

  // 6. Duplicate delivery guard: identical request de-duplicates safely
  const duplicateOutcome = await MetaPublishPipeline.executePublish(igReq);
  assert.strictEqual(duplicateOutcome.isDuplicateCall, true);
  assert.strictEqual(duplicateOutcome.externalId, igOutcome.externalId);
  console.log('✓ Repeated worker delivery safely de-duplicated without creating duplicate Meta posts');

  // 7. Authorized Facebook page publish with readback
  const fbOutcome = await MetaPublishPipeline.executePublish({
    organizationId: orgId,
    locationId: locId,
    variantId: randomUUID(),
    platform: 'FACEBOOK',
    targetAccountId: '1092837492019',
    message: 'Check out our latest roofing guide for homeowners.',
    accessToken: 'valid-user-token'
  });
  assert(fbOutcome.externalId);
  assert.strictEqual(fbOutcome.verifiedViaReadback, true);
  console.log(`✓ Facebook Page post published and verified via readback (ID: ${fbOutcome.externalId})`);

  console.log('Prompt 049 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
