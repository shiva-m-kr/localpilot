import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema, UserIdSchema } from './identifiers.js';

export const MembershipRoleSchema = z.enum([
  'owner',
  'admin',
  'editor',
  'approver',
  'analyst',
  'billing_manager',
  'platform_operator'
]);

export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const TenantContextSchema = z.object({
  organizationId: OrganizationIdSchema,
  userId: UserIdSchema,
  role: MembershipRoleSchema,
  locationId: LocationIdSchema.optional(),
  authorizedLocationIds: z.array(LocationIdSchema).optional(),
  isDemoMode: z.boolean().default(false)
});

export type TenantContext = z.infer<typeof TenantContextSchema>;
