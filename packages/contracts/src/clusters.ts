import { z } from 'zod';

export const IntentClusterSchema = z.object({
  id: z.string().uuid(),
  clusterName: z.string(),
  service: z.string(),
  targetLocality: z.string(),
  mappedKeywords: z.array(z.string()),
  primaryIntent: z.string(),
  recommendedCanonicalUrl: z.string(),
  isExistingPage: z.boolean(),
  actionType: z.enum(['IMPROVE_EXISTING_CANONICAL', 'CREATE_NEW_PAGE']),
  cannibalizationRisk: z.enum(['NONE', 'HIGH']),
  doorwayRisk: z.boolean()
});
export type IntentCluster = z.infer<typeof IntentClusterSchema>;
