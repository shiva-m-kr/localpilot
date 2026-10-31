import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ConsentModeSchema = z.enum(['review_first', 'auto_publish']);
export type ConsentMode = z.infer<typeof ConsentModeSchema>;

export const ConsentRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  provider: z.string(),
  actionType: z.string(),
  mode: ConsentModeSchema.default('review_first'),
  isRevoked: z.boolean().default(false),
  revokedAt: ISO8601TimestampSchema.optional(),
  isPaused: z.boolean().default(false),
  grantedByUserId: z.string().uuid(),
  grantedAt: ISO8601TimestampSchema
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const ApprovalRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  itemType: z.string(),
  itemId: z.string(),
  approvedPayloadHash: z.string(),
  approvedFactsVersion: z.number().int().nonnegative(),
  isSensitiveChange: z.boolean().default(false),
  approvedByUserId: z.string().uuid(),
  approvedAt: ISO8601TimestampSchema
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;
