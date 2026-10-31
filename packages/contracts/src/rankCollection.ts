import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const PointObservationStateSchema = z.enum([
  'FOUND',
  'NOT_FOUND_IN_DEPTH',
  'TASK_FAILED',
  'PENDING'
]);
export type PointObservationState = z.infer<typeof PointObservationStateSchema>;

export const PointObservationSchema = z.object({
  pointIndex: z.number().int().nonnegative(),
  latitude: z.number(),
  longitude: z.number(),
  state: PointObservationStateSchema,
  rank: z.number().int().positive().nullable(),
  matchedPlaceId: z.string().optional(),
  taskError: z.string().optional(),
  taskId: z.string(),
  retryCount: z.number().int().default(0)
});
export type PointObservation = z.infer<typeof PointObservationSchema>;

export const CompetitorCandidateSchema = z.object({
  placeId: z.string(),
  businessName: z.string(),
  rank: z.number().int().positive(),
  rating: z.number().optional(),
  reviewCount: z.number().int().optional(),
  observedAtPointIndex: z.number().int().nonnegative()
});
export type CompetitorCandidate = z.infer<typeof CompetitorCandidateSchema>;

export const ScanRunExecutionSchema = z.object({
  runId: z.string().uuid(),
  configId: z.string().uuid(),
  locationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  keyword: z.string(),
  status: z.enum([
    'QUEUED',
    'IN_PROGRESS',
    'COMPLETED_SUCCESS',
    'PARTIAL_FAILURE',
    'FAILED'
  ]),
  totalPoints: z.number().int().positive(),
  successfulPoints: z.number().int().nonnegative(),
  failedPoints: z.number().int().nonnegative(),
  notFoundPoints: z.number().int().nonnegative(),
  observations: z.array(PointObservationSchema),
  extractedCompetitors: z.array(CompetitorCandidateSchema).default([]),
  taskIds: z.array(z.string()).default([]),
  startedAt: ISO8601TimestampSchema,
  completedAt: ISO8601TimestampSchema.optional()
});
export type ScanRunExecution = z.infer<typeof ScanRunExecutionSchema>;
