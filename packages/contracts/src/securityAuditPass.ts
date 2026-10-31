import { z } from 'zod';

export const SecurityCheckCategorySchema = z.enum([
  'TENANT_ISOLATION',
  'SSRF_URL_PROTECTION',
  'SECRET_ENCRYPTION_SAFEGUARDS',
  'CONTENT_SANITIZATION_XSS',
  'SAB_ADDRESS_PRIVACY',
  'REVIEW_RETENTION_TTL',
  'CONSENT_REVOCATION_GATE',
  'HOST_HEADER_INJECTION',
]);
export type SecurityCheckCategory = z.infer<typeof SecurityCheckCategorySchema>;

export const SecurityCheckItemSchema = z.object({
  category: SecurityCheckCategorySchema,
  testCaseName: z.string(),
  passed: z.boolean(),
  evidenceDetails: z.string(),
  cveOrGuidelineReference: z.string(),
});
export type SecurityCheckItem = z.infer<typeof SecurityCheckItemSchema>;

export const SecurityAuditPassResultSchema = z.object({
  auditPassId: z.string().uuid(),
  totalChecksCount: z.number().int().min(0),
  passedChecksCount: z.number().int().min(0),
  failedChecksCount: z.number().int().min(0),
  isProductionLaunchApproved: z.boolean(),
  checks: z.array(SecurityCheckItemSchema),
  timestamp: z.string().datetime(),
});
export type SecurityAuditPassResult = z.infer<typeof SecurityAuditPassResultSchema>;
