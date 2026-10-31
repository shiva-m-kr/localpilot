import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const SearchSurfaceSchema = z.enum([
  'GOOGLE_MAPS',
  'LOCAL_PACK',
  'ORGANIC_SERP'
]);
export type SearchSurface = z.infer<typeof SearchSurfaceSchema>;

export const SearchDeviceSchema = z.enum(['MOBILE', 'DESKTOP']);
export type SearchDevice = z.infer<typeof SearchDeviceSchema>;

export const TargetIdentifierSchema = z.object({
  businessName: z.string().min(2),
  placeId: z.string().optional(),
  cid: z.string().optional(),
  domain: z.string().optional()
});
export type TargetIdentifier = z.infer<typeof TargetIdentifierSchema>;

export const RankQueryRequestSchema = z.object({
  query: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  surface: SearchSurfaceSchema,
  device: SearchDeviceSchema,
  language: z.string().default('en'),
  depth: z.number().int().min(1).max(100).default(20),
  target: TargetIdentifierSchema
});
export type RankQueryRequest = z.infer<typeof RankQueryRequestSchema>;

export const RankObservationResultSchema = z.object({
  taskId: z.string(),
  surface: SearchSurfaceSchema,
  device: SearchDeviceSchema,
  rank: z.number().int().positive().nullable(),
  found: z.boolean(),
  placeIdObserved: z.string().optional(),
  titleObserved: z.string().optional(),
  actualCostMicros: z.number().int().nonnegative(),
  isAmbiguousMatch: z.boolean(),
  confirmationRequired: z.boolean(),
  taskError: z.string().optional(),
  observedAt: ISO8601TimestampSchema
});
export type RankObservationResult = z.infer<typeof RankObservationResultSchema>;
