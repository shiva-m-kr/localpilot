import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const BrandVoicePreferencesSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  tone: z.enum(['reliable_honest', 'warm_welcoming', 'authoritative_expert', 'modern_dynamic']),
  approvedTerminology: z.array(z.string()).default([]),
  forbiddenClaims: z.array(z.string()).default([]),
  primaryColor: z.string().default('#c2410c'),
  updatedAt: ISO8601TimestampSchema
});

export type BrandVoicePreferences = z.infer<typeof BrandVoicePreferencesSchema>;

export const AssetClassSchema = z.enum([
  'REAL_PORTFOLIO',        // Verified photo of actual completed work or premises
  'LOGO',                  // Verified official business brand mark
  'GENERATED_ILLUSTRATION' // AI-generated illustrative artwork
]);
export type AssetClass = z.infer<typeof AssetClassSchema>;

export const RightsTypeSchema = z.enum([
  'OWNED_BY_BUSINESS',
  'LICENSED_STOCK',
  'AI_GENERATED_ILLUSTRATION'
]);
export type RightsType = z.infer<typeof RightsTypeSchema>;

export const AssetRecordSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  assetClass: AssetClassSchema,
  storagePath: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rightsHolder: z.string(),
  rightsType: RightsTypeSchema,
  isGeneratedIllustration: z.boolean(),
  generationPrompt: z.string().optional(),
  caption: z.string().max(250),
  altText: z.string().max(150),
  uploadedAt: ISO8601TimestampSchema,
  exifStripped: z.literal(true).default(true)
});

export type AssetRecord = z.infer<typeof AssetRecordSchema>;
