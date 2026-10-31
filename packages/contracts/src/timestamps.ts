import { z } from 'zod';

export const ISO8601TimestampSchema = z.string().datetime({ message: 'Must be a valid ISO-8601 UTC timestamp' });

export const SourceFreshnessMetadataSchema = z.object({
  sourceObservedAt: ISO8601TimestampSchema,
  fetchedAt: ISO8601TimestampSchema,
  expiresAt: ISO8601TimestampSchema.optional(),
  ttlSeconds: z.number().int().positive().optional(),
  isStale: z.boolean(),
  sourceClass: z.string()
});

export type SourceFreshnessMetadata = z.infer<typeof SourceFreshnessMetadataSchema>;
