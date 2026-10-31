import { z } from 'zod';

export const VisibilityMetricsSchema = z.object({
  totalGridPoints: z.number().int().positive(),
  evaluablePointsCount: z.number().int().nonnegative(),
  errorPointsCount: z.number().int().nonnegative(),
  foundPointsCount: z.number().int().nonnegative(),
  notFoundInDepthCount: z.number().int().nonnegative(),
  top3PointsCount: z.number().int().nonnegative(),
  top3CoveragePercent: z.number().min(0).max(100).nullable(),
  top10CoveragePercent: z.number().min(0).max(100).nullable(),
  averageFoundRank: z.number().positive().nullable(),
  labeledCappedAverageRank: z.number().positive().nullable(),
  cappedDepthValue: z.number().int().positive(),
  isUnavailable: z.boolean(),
  denominatorFormulaText: z.string(),
  explanation: z.string()
});
export type VisibilityMetrics = z.infer<typeof VisibilityMetricsSchema>;
