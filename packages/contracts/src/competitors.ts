import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const CompetitorSourceTypeSchema = z.enum([
  'SERP_DISCOVERED',
  'OWNER_SUPPLIED'
]);
export type CompetitorSourceType = z.infer<typeof CompetitorSourceTypeSchema>;

export const CompetitorClassificationSchema = z.enum([
  'LOCAL_SERVICE_COMPETITOR',
  'NATIONAL_DIRECTORY',
  'AGGREGATOR',
  'INFORMATIONAL_SITE'
]);
export type CompetitorClassification = z.infer<typeof CompetitorClassificationSchema>;

export const CompetitorEntitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  businessName: z.string().min(2),
  placeId: z.string().optional(),
  domain: z.string().optional(),
  classification: CompetitorClassificationSchema,
  sourceType: CompetitorSourceTypeSchema,
  isConfirmedByOwner: z.boolean().default(false),
  isExcluded: z.boolean().default(false),
  queryClusterIds: z.array(z.string().uuid()).default([]),
  observedFrequency: z.number().int().positive().default(1),
  lastObservedAt: ISO8601TimestampSchema
});
export type CompetitorEntity = z.infer<typeof CompetitorEntitySchema>;

export const CompetitorSetSchema = z.object({
  setId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  geographicCenter: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number()
  }),
  competitors: z.array(CompetitorEntitySchema),
  updatedAt: ISO8601TimestampSchema
});
export type CompetitorSet = z.infer<typeof CompetitorSetSchema>;
