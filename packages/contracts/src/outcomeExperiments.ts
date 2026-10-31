import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ExperimentStatusSchema = z.enum([
  'OBSERVATION_ACTIVE',
  'CONCLUDED_INCONCLUSIVE',
  'CONCLUDED_CORRELATED_LIFT',
  'CONCLUDED_NO_CHANGE',
  'CONCLUDED_CORRELATED_DROP'
]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

export const ConfounderTypeSchema = z.enum([
  'SEASONALITY',
  'SIMULTANEOUS_EDIT',
  'SMALL_SAMPLE_SIZE',
  'WEATHER_EVENT'
]);
export type ConfounderType = z.infer<typeof ConfounderTypeSchema>;

export const ConfounderItemSchema = z.object({
  type: ConfounderTypeSchema,
  description: z.string()
});
export type ConfounderItem = z.infer<typeof ConfounderItemSchema>;

export const MeasurementWindowSchema = z.object({
  startDate: ISO8601TimestampSchema,
  endDate: ISO8601TimestampSchema,
  observedValue: z.number().nullable()
});
export type MeasurementWindow = z.infer<typeof MeasurementWindowSchema>;

export const OutcomeExperimentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  actionPlanId: z.string().uuid(),
  hypothesis: z.string(),
  interventionDate: ISO8601TimestampSchema,
  baselineWindow: MeasurementWindowSchema,
  observationWindow: MeasurementWindowSchema,
  minRequiredObservationDays: z.number().int().default(28),
  status: ExperimentStatusSchema,
  confounders: z.array(ConfounderItemSchema).default([]),
  causationDisclaimer: z.string(),
  isPrematureToChange: z.boolean().default(true),
  conclusionNotes: z.string().optional(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type OutcomeExperiment = z.infer<typeof OutcomeExperimentSchema>;
