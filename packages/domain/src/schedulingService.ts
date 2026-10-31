import crypto from 'crypto';
import {
  ScheduleRule,
  ScheduledOccurrence,
  CatchUpPolicy,
  BlackoutWindow
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface CreateScheduleInput {
  organizationId: string;
  locationId?: string;
  targetTimezone: string; // e.g. "Asia/Kolkata", "America/New_York"
  localIntendedTime: string; // "HH:mm"
  recurrence: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  daysOfWeek?: number[];
  blackouts?: BlackoutWindow[];
  catchUpPolicy?: CatchUpPolicy;
}

export class SchedulingService {
  private static rules = new Map<string, ScheduleRule>();
  private static occurrences = new Map<string, ScheduledOccurrence>();

  static clear(): void {
    this.rules.clear();
    this.occurrences.clear();
  }

  static createRule(input: CreateScheduleInput): ScheduleRule {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Validate IANA timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.targetTimezone });
    } catch {
      throw new ValidationFailedError(`Invalid IANA timezone: ${input.targetTimezone}`);
    }

    // Validate blackout quiet periods (e.g. 9PM to 7AM)
    const [hours] = input.localIntendedTime.split(':').map(Number);
    const blackouts = input.blackouts || [{ startHour: 21, endHour: 7 }];
    for (const b of blackouts) {
      if (b.startHour > b.endHour) {
        // Wraps midnight (e.g. 21 to 7)
        if (hours >= b.startHour || hours < b.endHour) {
          throw new ValidationFailedError(
            `Intended time ${input.localIntendedTime} falls inside quiet blackout window (${b.startHour}:00 - ${b.endHour}:00).`
          );
        }
      } else {
        if (hours >= b.startHour && hours < b.endHour) {
          throw new ValidationFailedError(
            `Intended time ${input.localIntendedTime} falls inside quiet blackout window.`
          );
        }
      }
    }

    const rule: ScheduleRule = {
      id,
      organizationId: input.organizationId,
      locationId: input.locationId,
      targetTimezone: input.targetTimezone,
      localIntendedTime: input.localIntendedTime,
      recurrence: input.recurrence,
      daysOfWeek: input.daysOfWeek || [1, 2, 3, 4, 5],
      blackouts,
      catchUpPolicy: input.catchUpPolicy || 'SCHEDULE_NEXT_SLOT',
      revision: 1,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };

    this.rules.set(id, rule);
    return rule;
  }

  /**
   * Resolves the UTC timestamp for a specific target local date and intended time in the given timezone.
   */
  static resolveUtcOccurrence(
    rule: ScheduleRule,
    targetLocalDateStr: string // "YYYY-MM-DD"
  ): ScheduledOccurrence {
    const [targetYear, targetMonth, targetDay] = targetLocalDateStr.split('-').map(Number);
    const [targetHour, targetMin] = rule.localIntendedTime.split(':').map(Number);

    // Calculate UTC offset using Intl.DateTimeFormat for the given timezone
    const tempDate = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMin, 0));
    
    // Get time in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: rule.targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(tempDate);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const localHourInTz = Number(partMap.hour === '24' ? '00' : partMap.hour);
    const hourDiff = localHourInTz - targetHour;
    
    // Adjust UTC timestamp to match exact intended local time
    const adjustedUtcMs = tempDate.getTime() - hourDiff * 3600 * 1000;
    const targetUtcTime = new Date(adjustedUtcMs).toISOString();

    const logicalKey = `${rule.id}:${targetLocalDateStr}`;

    const occurrence: ScheduledOccurrence = {
      id: crypto.randomUUID(),
      scheduleRuleId: rule.id,
      logicalOccurrenceKey: logicalKey,
      targetUtcTime,
      localFormattedTime: `${targetLocalDateStr} ${rule.localIntendedTime} (${rule.targetTimezone})`,
      revision: rule.revision,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.occurrences.set(occurrence.id, occurrence);
    return occurrence;
  }

  /**
   * Reschedules an existing rule.
   * Cancels/supersedes previous pending occurrences safely and increments revision.
   */
  static rescheduleRule(
    ruleId: string,
    newLocalTime: string,
    newTimezone?: string
  ): { rule: ScheduleRule; supersededCount: number } {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new ValidationFailedError(`Rule ${ruleId} not found.`);
    }

    // Supersede existing pending occurrences
    let supersededCount = 0;
    for (const occ of this.occurrences.values()) {
      if (occ.scheduleRuleId === ruleId && occ.status === 'PENDING') {
        occ.status = 'SUPERSEDED';
        supersededCount++;
      }
    }

    rule.localIntendedTime = newLocalTime;
    if (newTimezone) {
      rule.targetTimezone = newTimezone;
    }
    rule.revision += 1;
    rule.updatedAt = new Date().toISOString();

    return { rule, supersededCount };
  }

  /**
   * Enforces catch-up policy after downtime.
   * Ensures missed social posts follow a visible catch-up policy instead of dumping a week's content all at once.
   */
  static processDowntimeCatchUp(
    ruleId: string,
    currentUtcTime: Date
  ): { queuedCount: number; droppedCount: number } {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new ValidationFailedError(`Rule ${ruleId} not found.`);
    }

    // Find all pending occurrences that were missed (targetUtcTime < currentUtcTime)
    const missedOccurrences: ScheduledOccurrence[] = [];
    for (const occ of this.occurrences.values()) {
      if (occ.scheduleRuleId === ruleId && occ.status === 'PENDING') {
        if (new Date(occ.targetUtcTime).getTime() < currentUtcTime.getTime()) {
          missedOccurrences.push(occ);
        }
      }
    }

    if (missedOccurrences.length === 0) {
      return { queuedCount: 0, droppedCount: 0 };
    }

    // Sort chronologically
    missedOccurrences.sort(
      (a, b) => new Date(a.targetUtcTime).getTime() - new Date(b.targetUtcTime).getTime()
    );

    let queuedCount = 0;
    let droppedCount = 0;

    if (rule.catchUpPolicy === 'DROP_MISSED') {
      // Drop all missed occurrences to avoid dumping stale content
      for (const occ of missedOccurrences) {
        occ.status = 'MISSED_DROPPED';
        droppedCount++;
      }
    } else if (rule.catchUpPolicy === 'SCHEDULE_NEXT_SLOT') {
      // Only keep the SINGLE latest missed occurrence, drop all earlier ones
      const latest = missedOccurrences[missedOccurrences.length - 1];
      for (let i = 0; i < missedOccurrences.length - 1; i++) {
        missedOccurrences[i].status = 'MISSED_DROPPED';
        droppedCount++;
      }
      // Re-queue the latest one for next daytime slot
      latest.status = 'PENDING';
      latest.targetUtcTime = new Date(currentUtcTime.getTime() + 300_000).toISOString(); // 5 min from now
      queuedCount = 1;
    }

    return { queuedCount, droppedCount };
  }

  static getOccurrence(id: string): ScheduledOccurrence | null {
    return this.occurrences.get(id) || null;
  }
}
