import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
  'RECONNECT_REQUIRED',
  'UNSUPPORTED_ACTION',
  'APPROVAL_REQUIRED',
  'QUOTA_EXCEEDED',
  'STALE_REVISION',
  'UNKNOWN_EXTERNAL_OUTCOME',
  'TENANT_ACCESS_DENIED',
  'RESOURCE_NOT_FOUND',
  'VALIDATION_FAILED',
  'CONFLICT_DETECTED',
  'RATE_LIMITED',
  'INTERNAL_ERROR'
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const UISafeErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  userAction: z.string().describe('Actionable instructions for the business owner'),
  remediationUrl: z.string().url().optional(),
  details: z.record(z.unknown()).optional(),
  statusCode: z.number().int().min(400).max(599)
});

export type UISafeError = z.infer<typeof UISafeErrorSchema>;
