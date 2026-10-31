import assert from 'assert';
import {
  OrganizationIdSchema,
  MoneySchema,
  ISO8601TimestampSchema,
  CommandEnvelopeSchema,
  JobAcceptedResponseSchema
} from '@localpilot/contracts';
import {
  MoneyService,
  ReconnectRequiredError,
  StaleRevisionError,
  UnknownExternalOutcomeError,
  QuotaExceededError,
  UnsupportedActionError
} from '@localpilot/domain';

console.log('Testing Shared Domain Contracts & Error Semantics (Prompt 005)...');

// 1. Validated Identifiers
console.log('1. Testing Validated Identifiers...');
assert.throws(() => {
  OrganizationIdSchema.parse('invalid-not-a-uuid');
}, /Must be a valid UUID v4/);

const validUuid = '123e4567-e89b-12d3-a456-426614174000';
const parsedId = OrganizationIdSchema.parse(validUuid);
assert.strictEqual(parsedId, validUuid);
console.log('  ✅ Invalid UUID rejected before domain work');

// 2. Money & Currency Minor Units
console.log('2. Testing Money & Currencies (Integer Minor Units)...');
assert.throws(() => {
  MoneySchema.parse({ amountMinor: 14.99, currency: 'INR' }); // Floating point not allowed
}, /Amount in minor units must be an integer/);

const m1 = MoneyService.create(150000, 'INR'); // 1500.00 INR
const m2 = MoneyService.create(50000, 'INR');  // 500.00 INR
const sum = MoneyService.add(m1, m2);
assert.strictEqual(sum.amountMinor, 200000);
assert.strictEqual(sum.currency, 'INR');

assert.throws(() => {
  const usd = MoneyService.create(1000, 'USD');
  MoneyService.add(m1, usd); // Currency mismatch rejected
}, /Currency mismatch/);
console.log('  ✅ Floating point rejected & Currency mismatch prevented');

// 3. Timestamps & Freshness
console.log('3. Testing Source Timestamps...');
assert.throws(() => {
  ISO8601TimestampSchema.parse('2026-10-28 09:30:00'); // Missing Z or timezone offset
});
const validTimestamp = '2026-10-28T09:30:00.000Z';
assert.strictEqual(ISO8601TimestampSchema.parse(validTimestamp), validTimestamp);
console.log('  ✅ ISO-8601 UTC timestamp enforced');

// 4. Versioned Async Commands & 202 Responses
console.log('4. Testing Async Commands & 202 Job Accepted Response...');
const validCommand = {
  commandId: '123e4567-e89b-12d3-a456-426614174001',
  commandType: 'scan.rankings.grid',
  version: 1,
  organizationId: validUuid,
  idempotencyKey: 'idemp-key-must-be-at-least-16-chars',
  createdAt: validTimestamp,
  payload: { lat: 12.9716, lng: 77.5946, keyword: 'emergency plumbing' }
};
const parsedCommand = CommandEnvelopeSchema.parse(validCommand);
assert.strictEqual(parsedCommand.commandType, 'scan.rankings.grid');

const job202 = JobAcceptedResponseSchema.parse({
  statusCode: 202,
  status: 'ACCEPTED',
  jobId: '123e4567-e89b-12d3-a456-426614174002',
  commandId: validCommand.commandId,
  statusUrl: 'https://api.localpilot.dev/v1/jobs/123e4567-e89b-12d3-a456-426614174002'
});
assert.strictEqual(job202.statusCode, 202);
console.log('  ✅ Command envelope & 202 Job Accepted verified');

// 5. Standardized Error Semantics & UI-Safe Messages
console.log('5. Testing Standardized Error Semantics...');
const reconnectErr = new ReconnectRequiredError('Google Business Profile', { accountId: 'gbp-123' }, 'https://app.localpilot.dev/settings/connections');
const uiSafeReconnect = reconnectErr.toUISafeError();
assert.strictEqual(uiSafeReconnect.code, 'RECONNECT_REQUIRED');
assert.strictEqual(uiSafeReconnect.statusCode, 401);
assert.ok(uiSafeReconnect.userAction.includes('Settings > Connections'));

const staleErr = new StaleRevisionError(1, 2);
const uiSafeStale = staleErr.toUISafeError();
assert.strictEqual(uiSafeStale.code, 'STALE_REVISION');
assert.strictEqual(uiSafeStale.statusCode, 409);

const unknownErr = new UnknownExternalOutcomeError('WordPress REST', 'ext-post-456');
const uiSafeUnknown = unknownErr.toUISafeError();
assert.strictEqual(uiSafeUnknown.code, 'UNKNOWN_EXTERNAL_OUTCOME');
assert.strictEqual(uiSafeUnknown.statusCode, 504);
assert.ok(uiSafeUnknown.userAction.includes('reconciliation'));

const quotaErr = new QuotaExceededError('grid_scan', 25, 10);
assert.strictEqual(quotaErr.toUISafeError().code, 'QUOTA_EXCEEDED');

const unsupportedErr = new UnsupportedActionError('publish_reel', 'Initial release supports photo posts only');
assert.strictEqual(unsupportedErr.toUISafeError().code, 'UNSUPPORTED_ACTION');

console.log('  ✅ Actionable UI-safe error contracts passed for all required failure modes');
console.log('🎉 Prompt 005 verification completed successfully!');
