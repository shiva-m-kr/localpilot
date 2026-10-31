import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ScanFrequencySchema = z.enum([
  'ONCE',
  'FOUR_TIMES_MONTHLY',
  'TRUE_WEEKLY',
  'DAILY'
]);
export type ScanFrequency = z.infer<typeof ScanFrequencySchema>;

export const ProviderScanModeSchema = z.enum([
  'STANDARD_QUEUED', // Standard SLA, lower cost
  'PRIORITY_LIVE' // Live SERP fetch, 1.5x cost
]);
export type ProviderScanMode = z.infer<typeof ProviderScanModeSchema>;

export const ScanEstimateSchema = z.object({
  keywordsCount: z.number().int().positive(),
  pointsCount: z.number().int().positive(),
  frequency: ScanFrequencySchema,
  mode: ProviderScanModeSchema,
  totalTasksPerRun: z.number().int().positive(),
  runsPerMonth: z.number().nonnegative(),
  totalTasksPerMonth: z.number().int().positive(),
  baseCostPerTaskMicros: z.number().int().positive(),
  depthMultiplier: z.number().positive(),
  modeMultiplier: z.number().positive(),
  estimatedMonthlyCostUsd: z.number().nonnegative(),
  requiredCredits: z.number().int().positive(),
  availableCredits: z.number().int().nonnegative(),
  canAfford: z.boolean(),
  effectivePriceDate: ISO8601TimestampSchema
});
export type ScanEstimate = z.infer<typeof ScanEstimateSchema>;

export const ScanScheduleCommandSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  configId: z.string().uuid(),
  frequency: ScanFrequencySchema,
  mode: ProviderScanModeSchema,
  idempotencyKey: z.string(),
  createdAt: ISO8601TimestampSchema
});
export type ScanScheduleCommand = z.infer<typeof ScanScheduleCommandSchema>;
