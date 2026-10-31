import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';
import { CurrencyCodeSchema, CurrencyCode } from './money.js';

export const ReservationStatusSchema = z.enum(['reserved', 'finalized', 'released']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const ReservationRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  provider: z.string(),
  operation: z.string(),
  estimatedCredits: z.number().int().positive(),
  actualCredits: z.number().int().nonnegative().optional(),
  estimatedCostMicros: z.number().int().nonnegative(),
  actualCostMicros: z.number().int().nonnegative().optional(),
  currency: CurrencyCodeSchema,
  status: ReservationStatusSchema,
  idempotencyKey: z.string(),
  createdAt: ISO8601TimestampSchema,
  finalizedAt: ISO8601TimestampSchema.optional(),
  releasedAt: ISO8601TimestampSchema.optional()
});
export type ReservationRecord = z.infer<typeof ReservationRecordSchema>;

export const TenantBudgetBalanceSchema = z.object({
  organizationId: z.string().uuid(),
  totalAllowanceCredits: z.number().int().nonnegative(),
  spentCredits: z.number().int().nonnegative(),
  reservedCredits: z.number().int().nonnegative(),
  availableCredits: z.number().int().nonnegative(),
  hardCapReached: z.boolean()
});
export type TenantBudgetBalance = z.infer<typeof TenantBudgetBalanceSchema>;
