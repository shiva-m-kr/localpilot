import { z } from 'zod';
import { SitePublicFactsSchema } from './siteRenderer.js';

export const SchemaBusinessSubtypeSchema = z.enum([
  'LocalBusiness',
  'Plumber',
  'Electrician',
  'HVACBusiness',
  'Dentist',
  'HairSalon',
  'Restaurant',
  'AutoRepair',
  'MedicalBusiness',
  'LegalService',
  'GeneralContractor',
  'AccountingService',
]);
export type SchemaBusinessSubtype = z.infer<typeof SchemaBusinessSubtypeSchema>;

export const SchemaValidationIssueSchema = z.object({
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
  field: z.string(),
  message: z.string(),
  guidelineReference: z.string(),
});
export type SchemaValidationIssue = z.infer<typeof SchemaValidationIssueSchema>;

export const GeneratedStructuredDataResultSchema = z.object({
  entityId: z.string().url(),
  schemaType: SchemaBusinessSubtypeSchema,
  jsonLdScript: z.string(),
  schemaObject: z.record(z.any()),
  validationIssues: z.array(SchemaValidationIssueSchema),
  isSABAddressSuppressed: z.boolean(),
  selfServingRatingExcluded: z.boolean(),
  marketingDisclaimer: z.string(),
});
export type GeneratedStructuredDataResult = z.infer<typeof GeneratedStructuredDataResultSchema>;
