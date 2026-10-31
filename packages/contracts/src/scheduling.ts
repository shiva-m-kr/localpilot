import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const CatchUpPolicySchema = z.enum([
  'DROP_MISSED',
  'SCHEDULE_NEXT_SLOT',
  'MANUAL_REVIEW'
]);
export type CatchUpPolicy = z.infer<typeof CatchUpPolicySchema>;

export const BlackoutWindowSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23)
});
export type BlackoutWindow = z.infer<typeof BlackoutWindowSchema>;

export const ScheduleRuleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  targetTimezone: z.string(), // IANA timezone e.g. "Asia/Kolkata", "America/New_York"
  localIntendedTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:mm
  recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  blackouts: z.array(BlackoutWindowSchema).default([{ startHour: 21, endHour: 7 }]), // 9PM to 7AM quiet hours
  catchUpPolicy: CatchUpPolicySchema.default('SCHEDULE_NEXT_SLOT'),
  revision: z.number().int().nonnegative().default(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).default('ACTIVE'),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type ScheduleRule = z.infer<typeof ScheduleRuleSchema>;

export const ScheduledOccurrenceSchema = z.object({
  id: z.string().uuid(),
  scheduleRuleId: z.string().uuid(),
  logicalOccurrenceKey: z.string(),
  targetUtcTime: ISO8601TimestampSchema,
  localFormattedTime: z.string(),
  revision: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'DISPATCHED', 'SUPERSEDED', 'MISSED_DROPPED', 'CANCELLED']),
  createdAt: ISO8601TimestampSchema
});
export type ScheduledOccurrence = z.infer<typeof ScheduledOccurrenceSchema>;
