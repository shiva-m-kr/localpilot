import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema } from './identifiers.js';

export const DomainStatusSchema = z.enum([
  'CLAIMED',
  'DNS_CHECKING',
  'ROUTE_ALLOCATED',
  'TLS_ISSUANCE',
  'HEALTH_CHECK',
  'ACTIVE',
  'FAILED_DNS',
  'FAILED_TLS',
  'FAILED_HEALTH',
  'PAUSED',
  'QUARANTINED', // Safety quarantine prevents dangling domain takeover
  'RELEASED',
]);
export type DomainStatus = z.infer<typeof DomainStatusSchema>;

export const TlsCertStatusSchema = z.enum([
  'PENDING_VALIDATION',
  'ISSUED',
  'FAILED',
  'EXPIRED',
  'REVOKED',
]);
export type TlsCertStatus = z.infer<typeof TlsCertStatusSchema>;

export const DnsVerificationMethodSchema = z.enum(['TXT_CHALLENGE', 'CNAME_RECORD']);
export type DnsVerificationMethod = z.infer<typeof DnsVerificationMethodSchema>;

export const CustomDomainRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  siteId: z.string().uuid(),
  hostname: z.string().min(3).max(253).toLowerCase().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/),
  isApexDomain: z.boolean().default(false),
  status: DomainStatusSchema.default('CLAIMED'),
  verificationMethod: DnsVerificationMethodSchema.default('TXT_CHALLENGE'),
  verificationToken: z.string().min(16),
  expectedTxtRecord: z.string(),
  expectedCnameTarget: z.string(),
  tlsStatus: TlsCertStatusSchema.default('PENDING_VALIDATION'),
  tlsIssuedAt: z.string().datetime().optional(),
  tlsExpiresAt: z.string().datetime().optional(),
  lastHealthCheckAt: z.string().datetime().optional(),
  lastHealthCheckPassed: z.boolean().default(false),
  failureReason: z.string().optional(),
  quarantinedUntil: z.string().datetime().optional(),
  claimedAt: z.string().datetime(),
  activatedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});
export type CustomDomainRecord = z.infer<typeof CustomDomainRecordSchema>;

export const ClaimDomainRequestSchema = z.object({
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  siteId: z.string().uuid(),
  hostname: z.string().min(3).max(253).toLowerCase(),
  verificationMethod: DnsVerificationMethodSchema.default('TXT_CHALLENGE'),
});
export type ClaimDomainRequest = z.infer<typeof ClaimDomainRequestSchema>;

export const VerifyDnsRequestSchema = z.object({
  domainId: z.string().uuid(),
  tenantId: OrganizationIdSchema,
});
export type VerifyDnsRequest = z.infer<typeof VerifyDnsRequestSchema>;

export const RouteResolutionResultSchema = z.object({
  isAllowed: z.boolean(),
  siteId: z.string().uuid().optional(),
  tenantId: OrganizationIdSchema.optional(),
  locationId: LocationIdSchema.optional(),
  isCustomDomain: z.boolean(),
  rejectionReason: z.string().optional(),
});
export type RouteResolutionResult = z.infer<typeof RouteResolutionResultSchema>;
