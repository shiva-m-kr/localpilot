import { randomUUID } from 'crypto';
import assert from 'assert';
import { ContentCalendarService } from '../packages/domain/src/contentCalendarService.js';
import { ValidationFailedError } from '../packages/domain/src/errors.js';
import { CalendarScheduleItem, BlackoutPeriod } from '../packages/contracts/src/contentCalendar.js';

async function runTest() {
  console.log('Testing Prompt 045: Wire the content calendar and review queues...');

  const orgId = randomUUID();
  const locId = randomUUID();
  const variantId = randomUUID();

  const blackoutPeriods: BlackoutPeriod[] = [
    {
      id: randomUUID(),
      locationId: locId,
      startDate: '2026-11-26T00:00:00.000Z',
      endDate: '2026-11-28T23:59:59.000Z',
      reason: 'Thanksgiving Holiday Closure'
    }
  ];

  // 1. Unapproved content cannot be scheduled
  assert.throws(
    () => {
      ContentCalendarService.scheduleApprovedItem({
        organizationId: orgId,
        locationId: locId,
        channelVariantId: variantId,
        platform: 'WORDPRESS_BLOG',
        title: 'Draft Unapproved Post',
        scheduledUtc: '2026-11-15T15:00:00.000Z',
        timezone: 'America/Chicago',
        isApproved: false, // Unapproved!
        existingItems: [],
        blackouts: blackoutPeriods
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Unapproved item must not be scheduled'
  );
  console.log('✓ Unapproved content blocked from entering schedule');

  // 2. Blackout dates reject scheduling
  assert.throws(
    () => {
      ContentCalendarService.scheduleApprovedItem({
        organizationId: orgId,
        locationId: locId,
        channelVariantId: variantId,
        platform: 'GBP_POST',
        title: 'Holiday Update',
        scheduledUtc: '2026-11-26T18:00:00.000Z', // Inside Thanksgiving blackout!
        timezone: 'America/Chicago',
        isApproved: true,
        existingItems: [],
        blackouts: blackoutPeriods
      });
    },
    (err: any) => err instanceof ValidationFailedError,
    'Blackout window must reject scheduling'
  );
  console.log('✓ Blackout date window enforced deterministically');

  // 3. Approved item schedules successfully
  const item1 = ContentCalendarService.scheduleApprovedItem({
    organizationId: orgId,
    locationId: locId,
    channelVariantId: variantId,
    platform: 'WORDPRESS_BLOG',
    title: 'Winter Roof Preparation Guide',
    scheduledUtc: '2026-11-10T14:00:00.000Z',
    timezone: 'America/Chicago',
    isApproved: true,
    estimatedCostUsd: 0.05,
    existingItems: [],
    blackouts: blackoutPeriods
  });

  assert.strictEqual(item1.status, 'SCHEDULED');
  assert.strictEqual(item1.isSuperseded, false);
  console.log('✓ Approved item scheduled successfully for dispatch');

  // 4. Same-platform collision within 2 hours is detected
  const collisionCheck = ContentCalendarService.checkCollisionsAndBlackouts({
    scheduledUtc: '2026-11-10T15:00:00.000Z', // 1 hour after item1 on same platform
    platform: 'WORDPRESS_BLOG',
    existingItems: [item1],
    blackouts: blackoutPeriods
  });

  assert.strictEqual(collisionCheck.hasCollision, true, 'Same platform within 2 hours must flag collision');
  console.log('✓ Channel collision guard detected conflicting schedule item within 2 hours');

  // 5. Rescheduling supersedes old entry
  const { supersededOldItem, newScheduledItem } = ContentCalendarService.rescheduleItem({
    currentItem: item1,
    newScheduledUtc: '2026-11-12T16:00:00.000Z',
    existingItems: [item1],
    blackouts: blackoutPeriods,
    reason: 'Operator requested 2-day delay for editorial review'
  });

  assert.strictEqual(supersededOldItem.isSuperseded, true);
  assert(supersededOldItem.supersededReason?.includes('Operator requested'));
  assert.strictEqual(newScheduledItem.isSuperseded, false);
  assert.strictEqual(newScheduledItem.scheduledUtc, '2026-11-12T16:00:00.000Z');
  console.log('✓ Rescheduling supersedes original item and creates new active schedule');

  // 6. Worker publish guard: superseded schedule CANNOT publish
  const canPublishOld = ContentCalendarService.canPublish(supersededOldItem);
  assert.strictEqual(canPublishOld.allowed, false, 'Superseded schedule item must not publish');
  assert(canPublishOld.reason?.includes('superseded'));

  const canPublishNew = ContentCalendarService.canPublish(newScheduledItem);
  assert.strictEqual(canPublishNew.allowed, true, 'Active new schedule item can publish');
  console.log('✓ Worker guard verified: superseded items are prevented from publishing');

  console.log('Prompt 045 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
