import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const ConnectionStatusSchema = z.enum([
  'connected',
  'reconnect_required',
  'disconnected'
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ConnectionRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  provider: z.string(),
  status: ConnectionStatusSchema,
  encryptedAccessToken: z.string(),
  encryptedRefreshToken: z.string().optional(),
  grantedScopes: z.array(z.string()),
  selectedWritableAssets: z.array(z.string()).default([]),
  expiresAt: ISO8601TimestampSchema.optional(),
  lastHealthCheckAt: ISO8601TimestampSchema,
  lastHealthStatus: z.string(),
  createdAt: ISO8601TimestampSchema,
  updatedAt: ISO8601TimestampSchema
});
export type ConnectionRecord = z.infer<typeof ConnectionRecordSchema>;

export const OAuthInitResponseSchema = z.object({
  authUrl: z.string(),
  state: z.string(),
  codeVerifier: z.string()
});
export type OAuthInitResponse = z.infer<typeof OAuthInitResponseSchema>;
