import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const WebhookProviderSchema = z.enum(['meta', 'google_pubsub', 'wordpress']);
export type WebhookProvider = z.infer<typeof WebhookProviderSchema>;

export const WebhookInboxRecordSchema = z.object({
  id: z.string().uuid(),
  provider: WebhookProviderSchema,
  eventId: z.string(),
  organizationId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  status: z.enum(['received', 'processing', 'processed', 'failed']),
  retentionDays: z.number().int().positive(),
  receivedAt: ISO8601TimestampSchema,
  processedAt: ISO8601TimestampSchema.optional(),
  expiresAt: ISO8601TimestampSchema
});
export type WebhookInboxRecord = z.infer<typeof WebhookInboxRecordSchema>;
