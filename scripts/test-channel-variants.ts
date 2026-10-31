import { randomUUID } from 'crypto';
import assert from 'assert';
import { ChannelVariantService } from '../packages/domain/src/channelVariantService.js';
import { ValidationFailedError } from '../packages/domain/src/errors.js';
import { ChannelVariant } from '../packages/contracts/src/channelVariants.js';

async function runTest() {
  console.log('Testing Prompt 044: Create independently editable channel variants...');

  const orgId = randomUUID();
  const locId = randomUUID();
  const campaignId = randomUUID();
  const mediaAssetId = randomUUID();

  // 1. Format validation check (Instagram requires media)
  assert.throws(
    () => {
      ChannelVariantService.createVariant({
        campaignId,
        organizationId: orgId,
        locationId: locId,
        platform: 'INSTAGRAM',
        destinationAccountId: 'ig-account-123',
        payload: {
          body: 'Check out our new roofing tips!' // Missing mediaAssetId!
        }
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Instagram variant without media asset must fail validation'
  );
  console.log('✓ Instagram format constraint verified (mediaAssetId required)');

  // 2. Multi-channel campaign with blog dependency
  const blogVariant = ChannelVariantService.createVariant({
    campaignId,
    organizationId: orgId,
    locationId: locId,
    platform: 'WORDPRESS_BLOG',
    destinationAccountId: 'wp-site-01',
    payload: {
      title: 'How to Spot Hail Damage on Asphalt Shingles',
      body: '<p>Hailstorms can compromise roof integrity...</p>'
    }
  });

  const socialVariant = ChannelVariantService.createVariant({
    campaignId,
    organizationId: orgId,
    locationId: locId,
    platform: 'FACEBOOK',
    destinationAccountId: 'fb-page-456',
    dependsOnVariantId: blogVariant.id,
    requiresBlogUrl: true,
    payload: {
      body: 'Did the recent storm affect your roof? Read our complete inspection checklist.',
      mediaAssetId
    }
  });

  assert.strictEqual(socialVariant.status, 'WAITING_ON_PREREQUISITE', 'Social variant must wait on blog prerequisite');
  
  // Cannot approve dependent variant prior to blog publication
  assert.throws(
    () => {
      ChannelVariantService.approveVariant(socialVariant);
    },
    (err: any) => err instanceof ValidationFailedError,
    'Cannot approve variant waiting on prerequisite'
  );
  console.log('✓ Dependent social variant starts in WAITING_ON_PREREQUISITE and blocks premature approval');

  // 3. Publish blog and unblock dependent social variant
  const approvedBlog = ChannelVariantService.approveVariant(blogVariant);
  const publishedBlog = ChannelVariantService.recordVariantPublished(approvedBlog, {
    externalId: 'wp-post-9876',
    liveUrl: 'https://apexroofing.example.com/blog/how-to-spot-hail-damage'
  });

  assert.strictEqual(publishedBlog.status, 'PUBLISHED');
  assert.strictEqual(publishedBlog.publishedLiveUrl, 'https://apexroofing.example.com/blog/how-to-spot-hail-damage');

  const unblockedVariants = ChannelVariantService.fulfillBlogPrerequisite(
    [socialVariant],
    publishedBlog.id,
    publishedBlog.publishedLiveUrl!
  );

  const updatedSocial = unblockedVariants[0];
  assert.strictEqual(updatedSocial.status, 'APPROVED', 'Social variant becomes APPROVED once prerequisite is fulfilled');
  assert.strictEqual(updatedSocial.prerequisiteVerifiedUrl, publishedBlog.publishedLiveUrl);
  assert.strictEqual(updatedSocial.payload.targetUrl, publishedBlog.publishedLiveUrl);
  console.log('✓ Verified blog publish automatically unblocked dependent social variant with live URL');

  // 4. Failure isolation: Facebook failure does NOT impact published blog
  const failedSocial = ChannelVariantService.recordVariantFailure(
    updatedSocial,
    'OAuth token expired during graph API request'
  );

  assert.strictEqual(failedSocial.status, 'FAILED');
  assert.strictEqual(publishedBlog.status, 'PUBLISHED', 'WordPress blog status remains PUBLISHED');
  assert.strictEqual(
    publishedBlog.publishedLiveUrl,
    'https://apexroofing.example.com/blog/how-to-spot-hail-damage',
    'Published live URL is never erased by social failure'
  );
  console.log('✓ Failure isolation: Social destination failure does not corrupt published blog');

  // 5. Campaign without blog (stand-alone business announcement)
  const standaloneCampaignId = randomUUID();
  const gbpVariant = ChannelVariantService.createVariant({
    campaignId: standaloneCampaignId,
    organizationId: orgId,
    locationId: locId,
    platform: 'GBP_POST',
    destinationAccountId: 'gbp-loc-777',
    requiresBlogUrl: false, // Standalone!
    payload: {
      body: 'Happy Memorial Day! Our office will be closed on Monday. Call 555-0199 for emergency tarping.',
      callToAction: {
        label: 'Call Now',
        actionType: 'CALL'
      }
    }
  });

  assert.strictEqual(gbpVariant.status, 'DRAFT');
  const approvedGbp = ChannelVariantService.approveVariant(gbpVariant);
  assert.strictEqual(approvedGbp.status, 'APPROVED');
  console.log('✓ Campaign without blog works cleanly as standalone update');

  console.log('Prompt 044 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
