import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FactService } from '@localpilot/domain';
import { FactConflictView } from '@localpilot/ui';

console.log('Testing Fact Confirmation, Versioning, and Conflict Resolution (Prompt 018)...');

const orgId = '00000000-0000-0000-0000-000000000001';
const locId = '20000000-0000-0000-0000-000000000001';
const userId = 'user-00000000-0000-0000-0000-000000000001';

// 1. Initial Fact Confirmation
console.log('1. Testing Fact Confirmation & Versioning...');
const scheduledDrafts = [
  { id: 'draft-01', title: 'Sunday Plumbing Emergency Guide', channel: 'wordpress', approvedAtFactsVersion: 1 },
  { id: 'draft-02', title: 'Weekend Callout Special Offer', channel: 'gbp', approvedAtFactsVersion: 1 }
];

const confirmed1 = FactService.confirmFact(
  orgId,
  locId,
  'NAP_PHONE',
  'publicPhone',
  '+91 80 4123 4567',
  userId,
  scheduledDrafts
);

assert.strictEqual(confirmed1.confirmedFact.value, '+91 80 4123 4567');
assert.strictEqual(confirmed1.confirmedFact.version, 2);
console.log('  ✅ Fact confirmed and initial version established');

// 2. Formatting vs Actual Disagreement
console.log('2. Testing Harmless Formatting vs Actual Disagreement...');
// Harmless formatting difference: same phone with dashes
const formatType = FactService.classifyConflict('NAP_PHONE', '+91 80 4123 4567', '+91-80-41234567');
assert.strictEqual(formatType, 'HARMLESS_FORMATTING');

// Actual disagreement: different phone number
const disagreeType = FactService.classifyConflict('NAP_PHONE', '+91 80 4123 4567', '+91 99 9999 9999');
assert.strictEqual(disagreeType, 'ACTUAL_DISAGREEMENT');
console.log('  ✅ Harmless formatting correctly distinguished from actual disagreement');

// 3. Conflicting Imports Never Overwrite Confirmed Values
console.log('3. Testing Ingestion Conflict Safety (Zero Silent Overwrites)...');
const conflictResult = FactService.ingestImportedFact(
  orgId,
  locId,
  'NAP_PHONE',
  'publicPhone',
  '+91 99 9999 9999', // Imported conflicting value
  'https://external-directory.example.in/apex'
);

assert.strictEqual(conflictResult.hasConflict, true);
assert.ok(conflictResult.conflictRecord);
assert.strictEqual(conflictResult.conflictRecord?.currentConfirmedValue, '+91 80 4123 4567');
assert.strictEqual(conflictResult.conflictRecord?.importedValue, '+91 99 9999 9999');
assert.strictEqual(conflictResult.conflictRecord?.status, 'UNRESOLVED');
console.log('  ✅ Conflicting imports safely isolated as unresolved conflicts; confirmed values untouched');

// 4. Downstream Draft Invalidation on Fact Update
console.log('4. Testing Downstream Draft Invalidation when Facts Change...');
// Updating public phone to a new confirmed value
const updatedFact = FactService.confirmFact(
  orgId,
  locId,
  'NAP_PHONE',
  'publicPhone',
  '+91 80 9999 8888',
  userId,
  scheduledDrafts // Drafts approved at v1
);

assert.strictEqual(updatedFact.newFactsVersion, 3);
assert.strictEqual(updatedFact.flaggedDrafts.length, 2);
assert.ok(updatedFact.flaggedDrafts.every(d => d.requiresReapproval === true));
assert.strictEqual(updatedFact.flaggedDrafts[0].staleFactKey, 'publicPhone');
console.log('  ✅ Confirmed fact changes incremented factsVersion to 3 and flagged all dependent drafts for re-approval');

// 5. Conflict Resolution UI Rendering
console.log('5. Testing Side-by-Side Conflict UI Rendering...');
const conflictUiHtml = renderToStaticMarkup(
  React.createElement(FactConflictView, {
    conflicts: [conflictResult.conflictRecord!],
    flaggedDrafts: updatedFact.flaggedDrafts,
    onAcceptImported: () => {},
    onRetainConfirmed: () => {}
  })
);

assert.ok(conflictUiHtml.includes('Fact Conflict Resolution'));
assert.ok(conflictUiHtml.includes('CURRENT CONFIRMED VALUE'));
assert.ok(conflictUiHtml.includes('UNCONFIRMED IMPORTED VALUE'));
assert.ok(conflictUiHtml.includes('Critical Facts Changed: 2 Downstream Drafts Need Review'));
console.log('  ✅ Side-by-side conflict resolution UI correctly renders diffs and downstream warnings');

console.log('🎉 Prompt 018 verification completed successfully!');
