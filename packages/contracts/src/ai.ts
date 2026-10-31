import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const AiModelTierSchema = z.enum([
  'economy_text',
  'quality_text',
  'illustration_image'
]);
export type AiModelTier = z.infer<typeof AiModelTierSchema>;

export const AiModelConfigSchema = z.object({
  tier: AiModelTierSchema,
  modelName: z.string(),
  costPer1kPromptTokensMicros: z.number().int().nonnegative(),
  costPer1kCompletionTokensMicros: z.number().int().nonnegative(),
  creditsPerCall: z.number().int().positive(),
  maxTokensLimit: z.number().int().positive()
});
export type AiModelConfig = z.infer<typeof AiModelConfigSchema>;

export const AiGenerationRequestSchema = z.object({
  organizationId: z.string().uuid(),
  tier: AiModelTierSchema,
  promptVersion: z.number().int().positive().default(1),
  confirmedFacts: z.record(z.unknown()),
  instructions: z.string(),
  reservationId: z.string().uuid(),
  expectedJsonSchema: z.record(z.unknown()).optional()
});
export type AiGenerationRequest = z.infer<typeof AiGenerationRequestSchema>;

export const AiGenerationResultSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
  modelUsed: z.string(),
  tier: AiModelTierSchema,
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  costMicros: z.number().int().nonnegative(),
  creditsCharged: z.number().int().positive(),
  durationMs: z.number().int().nonnegative(),
  completedAt: ISO8601TimestampSchema
});
export type AiGenerationResult = z.infer<typeof AiGenerationResultSchema>;
