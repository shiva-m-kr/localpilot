import { z } from 'zod';
import { CommandIdSchema, JobIdSchema, OrganizationIdSchema, LocationIdSchema, IdempotencyKeySchema } from './identifiers.js';
import { ISO8601TimestampSchema } from './timestamps.js';

export const CommandEnvelopeSchema = z.object({
  commandId: CommandIdSchema,
  commandType: z.string().min(3),
  version: z.number().int().positive().default(1),
  organizationId: OrganizationIdSchema,
  locationId: LocationIdSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
  createdAt: ISO8601TimestampSchema,
  payload: z.record(z.unknown())
});

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;

export const JobAcceptedResponseSchema = z.object({
  statusCode: z.literal(202).default(202),
  status: z.literal('ACCEPTED').default('ACCEPTED'),
  jobId: JobIdSchema,
  commandId: CommandIdSchema,
  statusUrl: z.string().url(),
  estimatedCompletionSeconds: z.number().int().positive().optional(),
  message: z.string().default('Job accepted for asynchronous processing')
});

export type JobAcceptedResponse = z.infer<typeof JobAcceptedResponseSchema>;
