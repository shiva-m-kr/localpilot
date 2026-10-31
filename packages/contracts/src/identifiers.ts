import { z } from 'zod';

export const UUIDv4Schema = z.string().uuid({ message: 'Must be a valid UUID v4' });

export const OrganizationIdSchema = UUIDv4Schema.brand<'OrganizationId'>();
export type OrganizationId = z.infer<typeof OrganizationIdSchema>;

export const BusinessIdSchema = UUIDv4Schema.brand<'BusinessId'>();
export type BusinessId = z.infer<typeof BusinessIdSchema>;

export const LocationIdSchema = UUIDv4Schema.brand<'LocationId'>();
export type LocationId = z.infer<typeof LocationIdSchema>;

export const UserIdSchema = UUIDv4Schema.brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

export const CommandIdSchema = UUIDv4Schema.brand<'CommandId'>();
export type CommandId = z.infer<typeof CommandIdSchema>;

export const JobIdSchema = UUIDv4Schema.brand<'JobId'>();
export type JobId = z.infer<typeof JobIdSchema>;

export const RevisionIdSchema = UUIDv4Schema.brand<'RevisionId'>();
export type RevisionId = z.infer<typeof RevisionIdSchema>;

export const CampaignIdSchema = UUIDv4Schema.brand<'CampaignId'>();
export type CampaignId = z.infer<typeof CampaignIdSchema>;

export const IdempotencyKeySchema = z.string().min(16).max(128);
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
