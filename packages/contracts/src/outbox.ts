import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const OutboxStatusSchema = z.enum(['pending', 'dispatched', 'failed']);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const OutboxEventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  eventType: z.string(),
  payloadVersion: z.number().int().min(1).default(1),
  payload: z.record(z.unknown()),
  status: OutboxStatusSchema.default('pending'),
  dispatchedAt: ISO8601TimestampSchema.optional(),
  logicalJobId: z.string().optional(),
  createdAt: ISO8601TimestampSchema
});
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;

export const CommandStatusSchema = z.enum(['received', 'processing', 'completed', 'failed']);
export type CommandStatus = z.infer<typeof CommandStatusSchema>;

export const CommandRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  commandType: z.string(),
  status: CommandStatusSchema.default('received'),
  outboxEventId: z.string().uuid(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema,
  result: z.record(z.unknown()).optional(),
  diagnostics: z.record(z.unknown()).optional()
});
export type CommandRecord = z.infer<typeof CommandRecordSchema>;

export const PollingStatusResponseSchema = z.object({
  commandId: z.string().uuid(),
  status: CommandStatusSchema,
  retryAfterMs: z.number().int().positive(),
  result: z.record(z.unknown()).optional(),
  diagnostics: z.record(z.unknown()).optional()
});
export type PollingStatusResponse = z.infer<typeof PollingStatusResponseSchema>;
