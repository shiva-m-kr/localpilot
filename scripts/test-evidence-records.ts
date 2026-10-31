import { randomUUID } from 'crypto';
import assert from 'assert';
import { EvidenceRecordService } from '../packages/domain/src/evidenceRecordService.js';

async function runTest() {
  console.log('Testing Prompt 061: Implement evidence records and expiring references...');

  EvidenceRecordService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();

  // 1. Owner Confirmed Fact has no auto-expiry
  const ownerFact = EvidenceRecordService.recordEvidence({
    organizationId: orgId,
    locationId: locId,
    sourceClass: 'OWNER_CONFIRMED_FACT',
    permittedPurpose: 'FACT_VERIFICATION',
    rawPayload: { phone: '+1-555-0199', confirmedBy: 'owner' },
    confidenceScore: 1.0,
    capturedAt: '2026-10-01T00:00:00.000Z'
  });

  assert.strictEqual(ownerFact.expiresAt, null, 'Owner confirmed facts should not auto-expire');
  assert.strictEqual(ownerFact.status, 'ACTIVE');
  console.log('✓ Owner confirmed fact created with null auto-expiry (persists until modified)');

  // 2. SERP observation has strict 30-day retention
  const serpEvidence = EvidenceRecordService.recordEvidence({
    organizationId: orgId,
    locationId: locId,
    sourceClass: 'SERP_OBSERVATION',
    permittedPurpose: 'RANK_TRACKING',
    rawPayload: { rank: 2, query: 'roof repair austin', placeId: 'ChIJ_apex_north' },
    confidenceScore: 0.95,
    capturedAt: '2026-10-01T00:00:00.000Z'
  });

  assert(serpEvidence.expiresAt !== null);
  const serpDays = Math.round(
    (new Date(serpEvidence.expiresAt!).getTime() - new Date('2026-10-01T00:00:00.000Z').getTime()) /
      (1000 * 60 * 60 * 24)
  );
  assert.strictEqual(serpDays, 30, 'SERP evidence must have 30-day expiry');
  console.log('✓ SERP observation recorded with strict 30-day retention window');

  // 3. Cryptographic integrity reference check
  assert(serpEvidence.integrityHash.length === 64, 'Integrity reference must be 64-char SHA-256');
  console.log('✓ Cryptographic integrity reference computed and verified');

  // 4. Evidence active validation (as of Day 10)
  const day10Check = EvidenceRecordService.validateEvidenceActive(
    serpEvidence.id,
    '2026-10-10T00:00:00.000Z'
  );
  assert.strictEqual(day10Check.isValid, true);
  console.log('✓ Day 10 check: Evidence confirmed active and valid');

  // 5. Expiration & Payload Purge Enforcement (as of Day 35)
  const purgeResult = EvidenceRecordService.purgeExpiredRecords('2026-11-05T00:00:00.000Z');
  assert.strictEqual(purgeResult.purgedCount, 1);
  assert(purgeResult.purgedIds.includes(serpEvidence.id));

  // Verify payload is nulled to prevent keeping restricted source payloads alive
  const purgedCheck = EvidenceRecordService.validateEvidenceActive(
    serpEvidence.id,
    '2026-11-05T00:00:00.000Z'
  );
  assert.strictEqual(purgedCheck.isValid, false);
  assert.strictEqual(purgedCheck.record?.payloadJson, null, 'Raw payload must be purged');
  assert(purgedCheck.reason?.includes('Proposal is STALE and requires re-collection'));
  console.log('✓ Source expiry strictly enforced: payload purged and proposal flagged as STALE (no invented reasoning)');

  console.log('Prompt 061 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
