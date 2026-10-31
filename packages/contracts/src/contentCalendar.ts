import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';
import { ChannelPlatformSchema } from './channelVariants.js';

export const CalendarViewModeSchema = z.enum(['MONTH', 'WEEK', 'AGENDA']);
export type CalendarViewMode = z.infer<typeof CalendarViewModeSchema>;

export const CalendarItemStatusSchema = z.enum([
  'PLANNED',
  'DRAFT',
  'APPROVED',
  'SCHEDULED',
  'PROVIDER_PENDING',
  'VERIFIED_PUBLISHED',
  'FAILED'
]);
export type CalendarItemStatus = z.infer<typeof CalendarItemStatusSchema>;

export const BlackoutPeriodSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid(),
  startDate: ISO8601TimestampSchema,
  endDate: ISO8601TimestampSchema,
  reason: z.string()
});
export type BlackoutPeriod = z.infer<typeof BlackoutPeriodSchema>;

export const CalendarScheduleItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  channelVariantId: z.string().uuid(),
  platform: ChannelPlatformSchema,
  title: z.string(),
  scheduledUtc: ISO8601TimestampSchema,
  timezone: z.string(), // e.g. "America/Chicago"
  status: CalendarItemStatusSchema,
  sourceFactIds: z.array(z.string().uuid()).default([]),
  estimatedCostUsd: z.number().nonnegative().default(0),
  isSuperseded: z.boolean().default(false),
  supersededReason: z.string().optional(),
  failureReason: z.string().optional(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type CalendarScheduleItem = z.infer<typeof CalendarScheduleItemSchema>;

export const CalendarCollisionCheckSchema = z.object({
  hasCollision: z.boolean(),
  inBlackout: z.boolean(),
  conflictingItemIds: z.array(z.string().uuid()).default([]),
  message: z.string().optional()
});
export type CalendarCollisionCheck = z.infer<typeof CalendarCollisionCheckSchema>;
