import assert from 'assert';
import { designTokens, checkWcagAA, getContrastRatio } from '@localpilot/ui';

console.log('Testing Orange Visual System & Measured Typography (Prompt 011)...');

// 1. Measured Typography Specs Verification
console.log('1. Testing Typography Tokens...');
assert.strictEqual(designTokens.typography.hero.desktop.fontSize, '68px');
assert.strictEqual(designTokens.typography.hero.desktop.lineHeight, '81.6px');
assert.strictEqual(designTokens.typography.hero.desktop.fontWeight, 700);
assert.strictEqual(designTokens.typography.hero.desktop.letterSpacing, '-1.2px');

assert.strictEqual(designTokens.typography.sectionHeading.desktop.fontSize, '56px');
assert.strictEqual(designTokens.typography.sectionHeading.desktop.lineHeight, '70px');
assert.strictEqual(designTokens.typography.sectionHeading.desktop.letterSpacing, '-1.44px');

assert.ok(designTokens.typography.fontDisplay.includes('Plus Jakarta Sans'));
assert.ok(designTokens.typography.fontBody.includes('Inter'));
console.log('  ✅ Measured desktop typography (68/81.6px hero, 56/70px section) verified');

// 2. WCAG Contrast Verification for Real Text and Action Controls
console.log('2. Testing WCAG 2.1 AA Contrast Ratios...');

// Primary button: White (#ffffff) on Dark Orange Action (#c2410c)
const primaryAction = checkWcagAA('#ffffff', designTokens.colors.action, false);
console.log(`  - Primary button text (White on Action #c2410c): ${primaryAction.ratio}:1 (Required: 4.5:1)`);
assert.ok(primaryAction.passes, `Primary action contrast failed: ${primaryAction.ratio}:1`);

// Main body ink (#0d0d12) on Canvas (#fffdfb)
const bodyInk = checkWcagAA(designTokens.colors.ink, designTokens.colors.canvas, false);
console.log(`  - Body text (Ink #0d0d12 on Canvas #fffdfb): ${bodyInk.ratio}:1 (Required: 4.5:1)`);
assert.ok(bodyInk.passes, `Body text contrast failed: ${bodyInk.ratio}:1`);

// Secondary text (#57534e) on Surface (#ffffff)
const secondaryText = checkWcagAA(designTokens.colors.textSecondary, designTokens.colors.surface, false);
console.log(`  - Secondary text (#57534e on Surface #ffffff): ${secondaryText.ratio}:1 (Required: 4.5:1)`);
assert.ok(secondaryText.passes, `Secondary text contrast failed: ${secondaryText.ratio}:1`);

// Semantic statuses on white surface:
const successCheck = checkWcagAA(designTokens.colors.success, '#ffffff', false);
assert.ok(successCheck.passes, `Success contrast failed: ${successCheck.ratio}:1`);

const dangerCheck = checkWcagAA(designTokens.colors.danger, '#ffffff', false);
assert.ok(dangerCheck.passes, `Danger contrast failed: ${dangerCheck.ratio}:1`);

const infoCheck = checkWcagAA(designTokens.colors.info, '#ffffff', false);
assert.ok(infoCheck.passes, `Info contrast failed: ${infoCheck.ratio}:1`);
console.log('  ✅ WCAG AA contrast passed for all text, button, and semantic indicator combinations');

// 3. Centralized Spatial & Radius Tokens
console.log('3. Testing Spatial, Radii, and Shadow Tokens...');
assert.strictEqual(designTokens.radii.control, '10px');
assert.strictEqual(designTokens.radii.card, '16px');
assert.strictEqual(designTokens.radii.panel, '24px');
assert.strictEqual(designTokens.radii.pill, '9999px');
assert.ok(designTokens.shadows.card.includes('rgba') || designTokens.shadows.card.includes('rgb'));
assert.ok(designTokens.shadows.float.includes('rgba') || designTokens.shadows.float.includes('rgb'));
console.log('  ✅ Radii and shadow tokens verified');

console.log('🎉 Prompt 011 verification completed successfully!');
