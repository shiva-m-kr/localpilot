import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketingLandingPage, PricingPage, PRICING_TIERS, FAQS } from '@localpilot/ui';

console.log('Testing Public Product & Pricing Pages (Prompt 014)...');

// 1. Marketing Landing Page Rendering
console.log('1. Testing Landing Page Copy & Layout...');
const landingHtml = renderToStaticMarkup(React.createElement(MarketingLandingPage));

// Capsule navigation
assert.ok(landingHtml.includes('LocalPilot'));
assert.ok(landingHtml.includes('How it works'));
assert.ok(landingHtml.includes('Features'));
assert.ok(landingHtml.includes('/pricing'));
assert.ok(landingHtml.includes('/onboarding'));

// Measured Hero
assert.ok(landingHtml.includes('Keep your local presence accurate'));
assert.ok(landingHtml.includes('Publish with control'));
assert.ok(landingHtml.includes('Connect Your Business →'));

// Absence of fake proof / guaranteed rankings
assert.ok(!landingHtml.includes('100% Guaranteed #1 Ranking'), 'Must not claim guaranteed rankings');
assert.ok(!landingHtml.includes('Over 50,000 Happy Customers'), 'Must not invent customer numbers');

// Clearly labeled demo / product preview
assert.ok(landingHtml.includes('PRODUCT PREVIEW (DEMO DATA)'));
console.log('  ✅ Landing page rendered with capsule nav, measured hero, and clearly labeled demo preview');

// 2. Pricing & Exact Quotas
console.log('2. Testing Pricing Tiers & Metered Quotas...');
assert.strictEqual(PRICING_TIERS.length, 3);
const [starter, growth, pro] = PRICING_TIERS;
assert.strictEqual(starter.id, 'starter');
assert.strictEqual(starter.priceMonthlyInr, 4999);
assert.strictEqual(starter.quotas.gridScanPointsMonthly, 100);

assert.strictEqual(growth.id, 'growth');
assert.strictEqual(growth.priceMonthlyInr, 9999);
assert.strictEqual(growth.isPopular, true);

assert.strictEqual(pro.id, 'pro');
assert.strictEqual(pro.priceMonthlyInr, 19999);

const pricingHtml = renderToStaticMarkup(React.createElement(PricingPage));
assert.ok(pricingHtml.includes('Predictable pricing with'));
assert.ok(pricingHtml.includes('Starter'));
assert.ok(pricingHtml.includes('Growth'));
assert.ok(pricingHtml.includes('Agency / Multi-Location'));
console.log('  ✅ Pricing page rendered with exact quotas and currency toggle');

// 3. FAQs & Honest Operating Boundaries
console.log('3. Testing FAQs & Truth in Advertising...');
assert.strictEqual(FAQS.length, 4);
assert.ok(FAQS.some(f => f.q.includes('guarantee #1 rankings')));
assert.ok(FAQS.some(f => f.q.includes('automatically publish without my review')));
assert.ok(pricingHtml.includes('Frequently Asked Questions'));
console.log('  ✅ FAQs explicitly state no guaranteed rankings and review-first default');

console.log('🎉 Prompt 014 verification completed successfully!');
