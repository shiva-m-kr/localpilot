import { randomUUID } from 'crypto';
import assert from 'assert';
import { SocialImageService } from '../packages/domain/src/socialImageService.js';
import { ValidationFailedError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 043: Add approved imagery and deterministic social templates...');

  SocialImageService.clearCache();
  const locId = randomUUID();
  const realPhotoId = randomUUID();

  // 1. Mandatory Real-Photo Rule for Portfolio Proof
  assert.throws(
    () => {
      SocialImageService.prepareSocialImage({
        locationId: locId,
        category: 'PORTFOLIO_PROOF', // Requires real photo!
        originType: 'AI_ILLUSTRATION',
        platform: 'INSTAGRAM_SQUARE',
        width: 1080,
        height: 1080,
        altText: 'Completed cedar shingle installation on local home',
        themeKey: 'cedar-shingle-portfolio'
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'AI illustration must be rejected for PORTFOLIO_PROOF'
  );
  console.log('✓ Rejected AI illustration for portfolio showcase (real photography strictly enforced)');

  // 2. Approved Real Photo for Portfolio Proof succeeds
  const realPhotoResult = SocialImageService.prepareSocialImage({
    locationId: locId,
    category: 'PORTFOLIO_PROOF',
    originType: 'APPROVED_REAL_PHOTO',
    platform: 'INSTAGRAM_SQUARE',
    width: 1080,
    height: 1080,
    altText: 'Completed cedar shingle installation on local home in Austin',
    themeKey: 'cedar-shingle-portfolio',
    realPhotoAssetId: realPhotoId,
    brandOverlay: { position: 'BOTTOM_RIGHT', opacity: 0.8 }
  });

  assert.strictEqual(realPhotoResult.billingIncurred, false, 'Real photos should not bill AI generation credits');
  assert(
    realPhotoResult.imageSpec.sourceRightsLabel.includes('Approved Client Real Photography'),
    'Real photo must carry verified copyright label'
  );
  console.log('✓ Approved real photography passed with verified copyright label');

  // 3. Aspect Ratio Validation
  assert.throws(
    () => {
      SocialImageService.prepareSocialImage({
        locationId: locId,
        category: 'EDUCATIONAL_TIP',
        originType: 'AI_ILLUSTRATION',
        platform: 'INSTAGRAM_SQUARE', // 1:1 required
        width: 1200,
        height: 600, // 2:1 ratio is invalid for square
        altText: 'Diagram illustrating how hail damages roof granules',
        themeKey: 'hail-damage-diagram'
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Invalid aspect ratio must fail validation'
  );
  console.log('✓ Aspect ratio mismatch rejected deterministically');

  // 4. AI-Generated Conceptual Illustration is explicitly labeled
  const aiIllustrationResult = SocialImageService.prepareSocialImage({
    locationId: locId,
    category: 'EDUCATIONAL_TIP',
    originType: 'AI_ILLUSTRATION',
    platform: 'GBP_UPDATE', // 4:3 (720x540 min)
    width: 800,
    height: 600, // 4:3 ratio
    altText: 'Diagram illustrating how hail damages roof granules and requires inspection',
    themeKey: 'hail-damage-infographic'
  });

  assert.strictEqual(aiIllustrationResult.billingIncurred, true, 'First AI generation bills usage');
  assert(
    aiIllustrationResult.imageSpec.sourceRightsLabel.includes('AI-Generated Conceptual Illustration'),
    'AI graphics must be explicitly labeled as conceptual illustration'
  );
  console.log('✓ AI illustration received mandatory disclaimer label');

  // 5. Asset Reuse Cache Lookup (prevents duplicate billing)
  const reusedResult = SocialImageService.prepareSocialImage({
    locationId: locId,
    category: 'EDUCATIONAL_TIP',
    originType: 'AI_ILLUSTRATION',
    platform: 'GBP_UPDATE',
    width: 800,
    height: 600,
    altText: 'Diagram illustrating how hail damages roof granules and requires inspection',
    themeKey: 'hail-damage-infographic' // Identical theme key and platform
  });

  assert.strictEqual(reusedResult.imageSpec.isReused, true, 'Asset should be marked as reused');
  assert.strictEqual(reusedResult.billingIncurred, false, 'Reused asset must not bill additional AI generation credits');
  assert.strictEqual(reusedResult.imageSpec.id, aiIllustrationResult.imageSpec.id, 'Should return matching cached spec');
  console.log('✓ Unchanged asset reused from cache with 0 additional billing');

  console.log('Prompt 043 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
