import assert from 'assert';
import { SeoDetectionRulesEngine } from '../packages/domain/src/seoDetectionRulesEngine.js';

async function runTest() {
  console.log('Testing Prompt 062: Implement deterministic local SEO detection rules...');

  // 1. Harmless formatting check: No false alarm!
  const harmlessPhone = SeoDetectionRulesEngine.evaluateCitation({
    confirmedPhone: '(512) 555-0199',
    observedPhone: '512-555-0199', // Only hyphenation difference
    confirmedAddress: '1200 Congress Avenue, Suite 400',
    observedAddress: '1200 Congress Ave, Ste 400' // Only Ave / Ste abbreviation difference
  });

  assert.strictEqual(harmlessPhone, null, 'Harmless formatting differences must NOT trigger false alarms');
  console.log('✓ Harmless address & phone formatting differences correctly ignored (no false alarms)');

  // 2. Real citation contradiction
  const realPhoneMismatch = SeoDetectionRulesEngine.evaluateCitation({
    confirmedPhone: '512-555-0199',
    observedPhone: '512-555-9999', // Actual different phone number!
    evidenceRecordId: 'ev-phone-123'
  });

  assert(realPhoneMismatch !== null);
  assert.strictEqual(realPhoneMismatch.category, 'CITATION_MISMATCH');
  assert.strictEqual(realPhoneMismatch.severity, 'CRITICAL');
  assert(realPhoneMismatch.factualSummary.includes('differs from confirmed business phone'));
  console.log('✓ Real phone number contradiction caught and flagged as CRITICAL CITATION_MISMATCH');

  // 3. Inconsistent Hours
  const hoursMismatch = SeoDetectionRulesEngine.evaluateHours({
    confirmedHours: 'Mon-Fri 08:00 - 17:00',
    observedHours: 'Mon-Sun Open 24 Hours',
    evidenceRecordId: 'ev-hours-456'
  });

  assert(hoursMismatch !== null);
  assert.strictEqual(hoursMismatch.category, 'INCONSISTENT_HOURS');
  assert(hoursMismatch.prerequisiteRequired?.includes('Owner must confirm current holiday'));
  console.log('✓ Inconsistent hours detected with prerequisite validation requirement');

  // 4. Technical Health: Broken booking link (HTTP 404) & NoIndex tag
  const techFindings = SeoDetectionRulesEngine.evaluateTechnicalHealth({
    bookingUrl: 'https://apexroofing.example.com/schedule-estimate',
    httpStatusCode: 404, // Broken link!
    isNoIndexDirectivePresent: true // Noindex blocking page!
  });

  assert.strictEqual(techFindings.length, 2);
  assert(techFindings.some((f) => f.category === 'BROKEN_BOOKING_LINK'));
  assert(techFindings.some((f) => f.category === 'INDEXABILITY_PROBLEM'));
  console.log('✓ Technical issues (HTTP 404 booking link and noindex tag) deterministically detected');

  // 5. Truth-in-SEO Check: Does not claim secret Google ranking weights
  for (const f of [...techFindings, realPhoneMismatch, hoursMismatch]) {
    assert(!f.remediationAdvice.includes("Google's algorithm will penalize"));
    assert(!f.factualSummary.includes('ranking factor weight'));
  }
  console.log('✓ Truth-in-SEO verified: Identifies concrete technical/customer issues without claiming secret Google weights');

  console.log('Prompt 062 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
