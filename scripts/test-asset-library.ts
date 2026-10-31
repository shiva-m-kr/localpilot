import assert from 'assert';
import crypto from 'crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssetLibraryService, ValidationFailedError, TenantAccessDeniedError } from '@localpilot/domain';
import { AssetLibraryView } from '@localpilot/ui';

console.log('--- RUNNING PROMPT 019: BRAND & APPROVED ASSET LIBRARY VERIFICATION ---');

const tenantA = crypto.randomUUID();
const tenantB = crypto.randomUUID();

// 1. Set Brand Preferences
const prefs = AssetLibraryService.saveBrandPreferences(
  tenantA,
  'authoritative_expert',
  ['Master Plumber', 'Zero Hidden Fees', 'Same-Day Dispatch'],
  ['Guaranteed #1 on Google', 'Best Plumber on Earth', 'Cheapest in Town']
);

assert.strictEqual(prefs.tone, 'authoritative_expert');
assert.strictEqual(prefs.approvedTerminology.length, 3);
assert.strictEqual(prefs.forbiddenClaims.length, 3);
console.log('✓ Brand voice preferences and forbidden claims registered.');

// 2. Register genuine portfolio photo with valid magic bytes
const validJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const realPhoto = AssetLibraryService.registerAsset({
  organizationId: tenantA,
  assetClass: 'REAL_PORTFOLIO',
  filename: 'bathroom-remodel-main.jpg',
  buffer: validJpgBuffer,
  declaredMimeType: 'image/jpeg',
  width: 1920,
  height: 1080,
  rightsHolder: 'Apex Plumbing LLC',
  rightsType: 'OWNED_BY_BUSINESS',
  caption: 'Master bathroom renovation completed in North York',
  altText: 'Renovated tiled bathroom with walk-in shower'
});

assert.strictEqual(realPhoto.isGeneratedIllustration, false);
assert.strictEqual(realPhoto.exifStripped, true);
assert.ok(realPhoto.storagePath.includes(`tenants/${tenantA}/`));
console.log('✓ Genuine business portfolio asset registered with EXIF stripping flag.');

// 3. Register AI generated illustration
const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
const aiIllustration = AssetLibraryService.registerAsset({
  organizationId: tenantA,
  assetClass: 'GENERATED_ILLUSTRATION',
  filename: 'winter-pipe-safety.png',
  buffer: validPngBuffer,
  declaredMimeType: 'image/png',
  width: 1200,
  height: 630,
  rightsHolder: 'LocalPilot GenAI Engine',
  rightsType: 'AI_GENERATED_ILLUSTRATION',
  generationPrompt: 'Diagram showing indoor shutoff valve during freezing temperatures',
  caption: 'Infographic: how to locate and close your water main',
  altText: 'Diagram of residential plumbing shutoff valve'
});

assert.strictEqual(aiIllustration.isGeneratedIllustration, true);
assert.strictEqual(aiIllustration.rightsType, 'AI_GENERATED_ILLUSTRATION');
console.log('✓ AI generated illustrative asset registered with mandatory generation label.');

// 4. Integrity Assertion: Attempt to mislabel AI illustration as REAL_PORTFOLIO
assert.throws(
  () => {
    AssetLibraryService.registerAsset({
      organizationId: tenantA,
      assetClass: 'REAL_PORTFOLIO',
      filename: 'fake-work.png',
      buffer: validPngBuffer,
      declaredMimeType: 'image/png',
      width: 1200,
      height: 630,
      rightsHolder: 'LocalPilot GenAI',
      rightsType: 'AI_GENERATED_ILLUSTRATION', // Mislabeled as REAL_PORTFOLIO!
      caption: 'Purporting to be our work',
      altText: 'Fake portfolio photo'
    });
  },
  (err: any) => {
    assert.ok(err instanceof ValidationFailedError);
    assert.ok(err.message.includes('AI generated illustrations cannot be registered as REAL_PORTFOLIO'));
    return true;
  }
);
console.log('✓ Prevented AI generated illustration from being mislabeled as actual portfolio work.');

// 5. Tenant Isolation: Ensure Tenant B cannot access Tenant A's private asset preview
assert.throws(
  () => {
    AssetLibraryService.getAssetPreviewUrl(realPhoto.id, tenantB);
  },
  (err: any) => {
    assert.ok(err instanceof TenantAccessDeniedError);
    return true;
  }
);
console.log('✓ Prevented cross-tenant access to private asset originals and previews.');

// 6. Authorized Tenant Access: Tenant A accesses preview URL
const preview = AssetLibraryService.getAssetPreviewUrl(realPhoto.id, tenantA);
assert.ok(preview.previewUrl.startsWith('https://media.localpilot.dev/'));
assert.ok(preview.previewUrl.includes('authSig='));
console.log('✓ Tenant A successfully generated pre-signed preview URL.');

// 7. Render AssetLibraryView UI component to static markup
const markup = renderToStaticMarkup(
  React.createElement(AssetLibraryView, {
    preferences: prefs,
    assets: [realPhoto, aiIllustration]
  })
);

assert.ok(markup.includes('Brand Voice &amp; Tone'));
assert.ok(markup.includes('Guaranteed #1 on Google'));
assert.ok(markup.includes('Asset Integrity Notice'));
assert.ok(markup.includes('VERIFIED REAL'));
assert.ok(markup.includes('AI ILLUSTRATION'));
console.log('✓ AssetLibraryView UI renders cleanly with clear distinction between real work and AI illustrations.');

console.log('--- PROMPT 019 VERIFIED SUCCESSFULLY ---');
