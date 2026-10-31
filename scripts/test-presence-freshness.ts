import assert from 'node:assert/strict';
import {
  PresenceFreshnessService,
  PresenceStorage,
  PresenceConflictRecord,
} from '@localpilot/domain';

async function runPresenceFreshnessTests() {
  console.log('--- Testing Presence Freshness and Conflict Monitoring (Prompt 093) ---');

  const locationId = '00000000-0000-0000-0000-000000000002';
  const conflicts: PresenceConflictRecord[] = [];
  const scheduledDrafts = [
    { id: 'draft-1', contentBody: 'Call our emergency team at +919876543210 for quick leak repair.', isInvalidated: false },
    { id: 'draft-2', contentBody: 'Visit our plumbing workshop in Bengaluru this weekend!', isInvalidated: false },
  ];

  let purgedCount = 0;

  const mockStorage: PresenceStorage = {
    async getConflictsForLocation(_locId: string) {
      return conflicts;
    },
    async saveConflict(c: PresenceConflictRecord) {
      conflicts.push(c);
    },
    async resolveConflict(cId: string) {
      const c = conflicts.find(x => x.id === cId);
      if (c) c.isResolved = true;
    },
    async getScheduledDraftsForLocation(_locId: string) {
      return scheduledDrafts;
    },
    async invalidateDraft(draftId: string, _reason: string) {
      const d = scheduledDrafts.find(x => x.id === draftId);
      if (d) d.isInvalidated = true;
    },
    async purgeExpiredCacheRecords(_olderThan: string) {
      purgedCount = 15;
      return purgedCount;
    },
  };

  const service = new PresenceFreshnessService(mockStorage);

  // Test 1: External Provider Change queues owner-confirmed task (NO auto-revert!)
  console.log('Test 1: Google edit queues owner task rather than blindly auto-reverting');
  const conflict = await service.handleObservedExternalChange({
    locationId,
    sourceProvider: 'Google Business Profile',
    field: 'HOURS',
    confirmedLocalValue: 'Mon-Fri 08:00-20:00',
    observedExternalValue: 'Mon-Fri 09:00-18:00',
  });

  assert.equal(conflict.suggestedAction, 'QUEUE_OWNER_CORRECTION_TASK');
  assert.equal(conflict.isResolved, false);
  assert.ok(conflict.actionExplanation.includes('Awaiting owner review'));

  // Test 2: Duplicate task suppression
  console.log('Test 2: Duplicate task suppression');
  const duplicate = await service.handleObservedExternalChange({
    locationId,
    sourceProvider: 'Google Business Profile',
    field: 'HOURS',
    confirmedLocalValue: 'Mon-Fri 08:00-20:00',
    observedExternalValue: 'Mon-Fri 09:00-18:00',
  });
  assert.equal(duplicate.id, conflict.id, 'Duplicate observation must return existing task');

  // Test 3: Changed facts invalidate dependent drafts
  console.log('Test 3: Changed facts invalidate dependent drafts');
  const invalidation = await service.handleFactChangeInvalidation(
    locationId,
    'PHONE',
    '+919876543210',
    '+918888888888'
  );

  assert.equal(invalidation.affectedDraftsCount, 1);
  assert.equal(invalidation.invalidatedDraftIds[0], 'draft-1');
  assert.equal(scheduledDrafts[0].isInvalidated, true, 'Draft-1 should now be invalidated');
  assert.equal(scheduledDrafts[1].isInvalidated, false, 'Draft-2 did not mention old phone and remains valid');

  // Test 4: Stale offer protection
  console.log('Test 4: Stale offer protection');
  const activeOffer = {
    startDateIso: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endDateIso: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  const expiredOffer = {
    startDateIso: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDateIso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Expired 2 days ago
  };

  assert.equal(service.isOfferActive(activeOffer), true, 'Active offer is valid');
  assert.equal(service.isOfferActive(expiredOffer), false, 'Expired offer must NOT be active');

  // Test 5: Storage TTL cleanup
  console.log('Test 5: Storage TTL cleanup');
  const cleaned = await service.cleanupExpiredProviderData(30);
  assert.equal(cleaned, 15);

  console.log('Prompt 093 verified successfully! Phase H: Citations and Local Presence is 100% COMPLETE!\n');
}

runPresenceFreshnessTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
