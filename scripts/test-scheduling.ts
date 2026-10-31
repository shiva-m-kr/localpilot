import assert from 'assert';
import crypto from 'crypto';
import { SchedulingService, ValidationFailedError } from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 026: TIMEZONE-AWARE SCHEDULING & CATCH-UP RULES VERIFICATION ---');

  SchedulingService.clear();

  const tenantId = crypto.randomUUID();

  // 1. Blackout Window Validation: Cannot schedule during quiet hours (e.g. 23:00 / 11PM)
  assert.throws(
    () => {
      SchedulingService.createRule({
        organizationId: tenantId,
        targetTimezone: 'Asia/Kolkata',
        localIntendedTime: '23:30', // 11:30 PM (inside 9PM-7AM blackout)
        recurrence: 'DAILY'
      });
    },
    (err: any) => {
      assert.ok(err instanceof ValidationFailedError);
      assert.ok(err.message.includes('quiet blackout window'));
      return true;
    }
  );
  console.log('✓ Quiet periods and blackout hours enforced.');

  // 2. Create valid rule for 10:00 AM in Asia/Kolkata timezone
  const rule = SchedulingService.createRule({
    organizationId: tenantId,
    targetTimezone: 'Asia/Kolkata',
    localIntendedTime: '10:00',
    recurrence: 'DAILY',
    catchUpPolicy: 'SCHEDULE_NEXT_SLOT'
  });

  assert.strictEqual(rule.localIntendedTime, '10:00');
  assert.strictEqual(rule.targetTimezone, 'Asia/Kolkata');
  assert.strictEqual(rule.revision, 1);
  console.log('✓ Timezone-aware schedule rule created for Asia/Kolkata at 10:00 local time.');

  // 3. Resolve single logical occurrence for target date
  const occ1 = SchedulingService.resolveUtcOccurrence(rule, '2026-11-02');
  assert.strictEqual(occ1.logicalOccurrenceKey, `${rule.id}:2026-11-02`);
  assert.strictEqual(occ1.status, 'PENDING');
  assert.strictEqual(occ1.revision, 1);
  console.log('✓ Resolved one logical occurrence matching target local date and timezone.');

  // 4. Rescheduling cancels superseded work safely and increments revision
  const { rule: updatedRule, supersededCount } = SchedulingService.rescheduleRule(
    rule.id,
    '14:00', // Moved to 2:00 PM
    'Asia/Kolkata'
  );

  assert.strictEqual(updatedRule.revision, 2);
  assert.strictEqual(supersededCount, 1);

  const recheckOcc1 = SchedulingService.getOccurrence(occ1.id);
  assert.strictEqual(recheckOcc1?.status, 'SUPERSEDED'); // Safely superseded!
  console.log('✓ Rescheduling safely superseded existing pending occurrences and incremented revision.');

  // 5. Catch-up policy after downtime:
  // Suppose system experienced downtime and 5 occurrences were missed (e.g. from 5 days of scheduled daily posts)
  SchedulingService.clear();

  const catchUpRule = SchedulingService.createRule({
    organizationId: tenantId,
    targetTimezone: 'Asia/Kolkata',
    localIntendedTime: '11:00',
    recurrence: 'DAILY',
    catchUpPolicy: 'SCHEDULE_NEXT_SLOT'
  });

  // Create 5 missed occurrences in the past
  const pastDates = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'];
  for (const d of pastDates) {
    SchedulingService.resolveUtcOccurrence(catchUpRule, d);
  }

  // Current time is after all 5 occurrences
  const currentTime = new Date('2026-10-25T12:00:00Z');
  const catchUpResult = SchedulingService.processDowntimeCatchUp(catchUpRule.id, currentTime);

  // Catch-up policy must drop the 4 older posts and only queue the 1 latest post!
  // This guarantees we NEVER dump a week's content onto public accounts at once!
  assert.strictEqual(catchUpResult.queuedCount, 1);
  assert.strictEqual(catchUpResult.droppedCount, 4);
  console.log('✓ Downtime catch-up policy verified: avoided dumping a week of missed posts at once (1 queued, 4 dropped).');

  console.log('--- PROMPT 026 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
