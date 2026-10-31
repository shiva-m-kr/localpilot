import { randomUUID } from 'crypto';
import {
  CalendarScheduleItem,
  BlackoutPeriod,
  CalendarCollisionCheck,
  ChannelPlatform,
  CalendarItemStatus
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ContentCalendarService {
  private static readonly MIN_INTERVAL_HOURS = 2;

  /**
   * Evaluates blackout dates and channel scheduling collisions.
   */
  static checkCollisionsAndBlackouts(params: {
    scheduledUtc: string;
    platform: ChannelPlatform;
    existingItems: CalendarScheduleItem[];
    blackouts: BlackoutPeriod[];
    excludeItemId?: string;
  }): CalendarCollisionCheck {
    const targetTime = new Date(params.scheduledUtc).getTime();

    // 1. Blackout Check
    for (const b of params.blackouts) {
      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();
      if (targetTime >= bStart && targetTime <= bEnd) {
        return {
          hasCollision: false,
          inBlackout: true,
          conflictingItemIds: [],
          message: `Date falls inside scheduled blackout period: "${b.reason}"`
        };
      }
    }

    // 2. Collision Check (min interval per platform)
    const minIntervalMs = this.MIN_INTERVAL_HOURS * 60 * 60 * 1000;
    const conflictingIds: string[] = [];

    for (const item of params.existingItems) {
      if (item.id === params.excludeItemId) continue;
      if (item.isSuperseded || item.status === 'FAILED' || item.status === 'VERIFIED_PUBLISHED') {
        continue;
      }
      if (item.platform === params.platform) {
        const itemTime = new Date(item.scheduledUtc).getTime();
        if (Math.abs(itemTime - targetTime) < minIntervalMs) {
          conflictingIds.push(item.id);
        }
      }
    }

    if (conflictingIds.length > 0) {
      return {
        hasCollision: true,
        inBlackout: false,
        conflictingItemIds: conflictingIds,
        message: `Collision: Another ${params.platform} post is scheduled within ${this.MIN_INTERVAL_HOURS} hours.`
      };
    }

    return {
      hasCollision: false,
      inBlackout: false,
      conflictingItemIds: []
    };
  }

  /**
   * Schedules an approved content item.
   */
  static scheduleApprovedItem(params: {
    organizationId: string;
    locationId: string;
    channelVariantId: string;
    platform: ChannelPlatform;
    title: string;
    scheduledUtc: string;
    timezone: string;
    isApproved: boolean;
    sourceFactIds?: string[];
    estimatedCostUsd?: number;
    existingItems: CalendarScheduleItem[];
    blackouts: BlackoutPeriod[];
  }): CalendarScheduleItem {
    if (!params.isApproved) {
      throw new ValidationFailedError('Cannot schedule unapproved content variant. Explicit approval required.');
    }

    const check = this.checkCollisionsAndBlackouts({
      scheduledUtc: params.scheduledUtc,
      platform: params.platform,
      existingItems: params.existingItems,
      blackouts: params.blackouts
    });

    if (check.inBlackout) {
      throw new ValidationFailedError(`Cannot schedule during blackout: ${check.message}`);
    }

    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      organizationId: params.organizationId,
      locationId: params.locationId,
      channelVariantId: params.channelVariantId,
      platform: params.platform,
      title: params.title,
      scheduledUtc: params.scheduledUtc,
      timezone: params.timezone,
      status: 'SCHEDULED',
      sourceFactIds: params.sourceFactIds || [],
      estimatedCostUsd: params.estimatedCostUsd || 0,
      isSuperseded: false,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Reschedules an existing item.
   * Supersedes the old schedule item so worker will never publish it.
   */
  static rescheduleItem(params: {
    currentItem: CalendarScheduleItem;
    newScheduledUtc: string;
    newTimezone?: string;
    existingItems: CalendarScheduleItem[];
    blackouts: BlackoutPeriod[];
    reason?: string;
  }): { supersededOldItem: CalendarScheduleItem; newScheduledItem: CalendarScheduleItem } {
    if (params.currentItem.isSuperseded) {
      throw new ValidationFailedError('Cannot reschedule an already superseded schedule item.');
    }

    const check = this.checkCollisionsAndBlackouts({
      scheduledUtc: params.newScheduledUtc,
      platform: params.currentItem.platform,
      existingItems: params.existingItems,
      blackouts: params.blackouts,
      excludeItemId: params.currentItem.id
    });

    if (check.inBlackout) {
      throw new ValidationFailedError(`Reschedule target is in blackout: ${check.message}`);
    }

    const now = new Date().toISOString();
    const supersededOldItem: CalendarScheduleItem = {
      ...params.currentItem,
      isSuperseded: true,
      supersededReason: params.reason || `Rescheduled to ${params.newScheduledUtc}`,
      updatedAt: now
    };

    const newScheduledItem: CalendarScheduleItem = {
      ...params.currentItem,
      id: randomUUID(),
      scheduledUtc: params.newScheduledUtc,
      timezone: params.newTimezone || params.currentItem.timezone,
      status: 'SCHEDULED',
      isSuperseded: false,
      supersededReason: undefined,
      createdAt: now,
      updatedAt: now
    };

    return { supersededOldItem, newScheduledItem };
  }

  /**
   * Guard for worker dispatch: superseded schedules must never publish.
   */
  static canPublish(item: CalendarScheduleItem): { allowed: boolean; reason?: string } {
    if (item.isSuperseded) {
      return { allowed: false, reason: `Item is superseded: ${item.supersededReason}` };
    }
    if (item.status !== 'SCHEDULED') {
      return { allowed: false, reason: `Item status is ${item.status}, expected SCHEDULED` };
    }
    return { allowed: true };
  }
}
