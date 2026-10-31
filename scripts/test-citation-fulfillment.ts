import assert from 'node:assert/strict';
import {
  CitationFulfillmentService,
  CitationFulfillmentStorage,
  CitationFulfillmentRecord,
} from '@localpilot/domain';

async function runCitationFulfillmentTests() {
  console.log('--- Testing Citation Fulfillment and Owner Tasks (Prompt 091) ---');

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const locationId = '00000000-0000-0000-0000-000000000002';

  const recordMap = new Map<string, CitationFulfillmentRecord>();
  let totalCreditsSpent = 0;

  const mockStorage: CitationFulfillmentStorage = {
    async getFulfillmentById(id: string) {
      return recordMap.get(id) || null;
    },
    async getFulfillmentByDirectory(locId: string, dirId: string) {
      for (const rec of recordMap.values()) {
        if (rec.locationId === locId && rec.directoryId === dirId) return rec;
      }
      return null;
    },
    async saveFulfillment(record: CitationFulfillmentRecord) {
      recordMap.set(record.id, { ...record });
    },
    async getConfirmedBusinessFacts(_locId: string) {
      return {
        businessName: 'Apex Emergency Plumbing',
        phone: '+919876543210',
      };
    },
    async spendCredits(_tId: string, amount: number) {
      totalCreditsSpent += amount;
    },
  };

  const service = new CitationFulfillmentService(mockStorage);

  // Test 1: Prepare Fulfillment starts in PREPARED and isLiveVerified = false
  console.log('Test 1: Prepare fulfillment');
  const prepared = await service.prepareFulfillment(tenantId, locationId, 'justdial-in');
  assert.equal(prepared.status, 'PREPARED');
  assert.equal(prepared.isLiveVerified, false);
  assert.equal(prepared.directoryName, 'Justdial');

  // Test 2: Submission requires owner verification for OTP directories and keeps isLiveVerified = false
  console.log('Test 2: Submission never implies live publication (OTP directory routes to owner task)');
  const submittedOtp = await service.submitCitation(prepared.id, 0);
  assert.equal(submittedOtp.status, 'VERIFICATION_NEEDED');
  assert.equal(submittedOtp.isLiveVerified, false, 'Submission must NEVER imply live publication!');
  assert.equal(submittedOtp.ownerTask?.taskType, 'ENTER_PHONE_OTP');
  assert.ok(submittedOtp.ownerTask?.portalUrl?.includes('justdial.com'));

  // Test 3: Budget check for Partner Feeds
  console.log('Test 3: Partner feed budget reservation');
  const applePrep = await service.prepareFulfillment(tenantId, locationId, 'apple-maps-global');
  // Attempt without sufficient budget
  await assert.rejects(
    async () => {
      await service.submitCitation(applePrep.id, 5); // Needs 10 credits
    },
    (err: any) => {
      assert.ok(err.message.includes('Partner feed submission requires 10 credits'));
      return true;
    }
  );

  // Submit with sufficient budget (10 credits)
  const appleSubmitted = await service.submitCitation(applePrep.id, 10);
  assert.equal(appleSubmitted.status, 'SUBMITTED');
  assert.equal(appleSubmitted.partnerFeeCreditsSpent, 10);
  assert.equal(totalCreditsSpent, 10);

  // Test 4: Retry deduplication does not re-charge partner credits
  console.log('Test 4: Retry deduplication prevents duplicate billing');
  await service.submitCitation(applePrep.id, 10);
  assert.equal(totalCreditsSpent, 10, 'Credits spent must remain 10 (not doubled)!');

  // Test 5: Evidence mismatch is rejected
  console.log('Test 5: Evidence mismatch rejection');
  await assert.rejects(
    async () => {
      await service.verifyLiveCitation(prepared.id, {
        liveListingUrl: 'https://justdial.com/listing/unrelated-bakery',
        observedAt: new Date().toISOString(),
        verifiedBusinessName: 'Delhi Artisanal Bakery', // Completely different business!
        verifiedPhone: '+919876543210',
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('Evidence mismatch'));
      return true;
    }
  );

  // Test 6: Valid live evidence transitions to LIVE_VERIFIED and enters verified count
  console.log('Test 6: Valid live evidence confirms listing and enters verified count');
  const verified = await service.verifyLiveCitation(prepared.id, {
    liveListingUrl: 'https://justdial.com/listing/apex-emergency-plumbing',
    observedAt: new Date().toISOString(),
    verifiedBusinessName: 'Apex Emergency Plumbing',
    verifiedPhone: '+919876543210',
  });

  assert.equal(verified.status, 'LIVE_VERIFIED');
  assert.equal(verified.isLiveVerified, true);
  assert.ok(verified.verifiedAt);

  console.log('Prompt 091 verified successfully!\n');
}

runCitationFulfillmentTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
