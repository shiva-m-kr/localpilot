import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const KeywordTypeSchema = z.enum(['BRANDED', 'NON_BRANDED']);
export type KeywordType = z.infer<typeof KeywordTypeSchema>;

export const LocationIntentTypeSchema = z.enum(['EXPLICIT_LOCATION', 'IMPLIED_LOCATION']);
export type LocationIntentType = z.infer<typeof LocationIntentTypeSchema>;

export const VolumeDataSourceSchema = z.enum([
  'MEASURED_DATAFORSEO',
  'OBSERVED_GSC',
  'UNAVAILABLE'
]);
export type VolumeDataSource = z.infer<typeof VolumeDataSourceSchema>;

export const KeywordCandidateSchema = z.object({
  keyword: z.string(),
  service: z.string(),
  locality: z.string(),
  intent: z.enum(['TRANSACTIONAL', 'COMMERCIAL', 'INFORMATIONAL']),
  type: KeywordTypeSchema,
  locationIntent: LocationIntentTypeSchema,
  monthlyVolume: z.number().int().nonnegative().nullable(),
  difficulty: z.number().min(0).max(100).nullable(),
  volumeSource: VolumeDataSourceSchema,
  observedAt: ISO8601TimestampSchema.optional()
});
export type KeywordCandidate = z.infer<typeof KeywordCandidateSchema>;
