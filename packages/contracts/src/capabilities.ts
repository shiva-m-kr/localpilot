import { z } from 'zod';

export const CapabilitySchema = z.enum([
  'content:draft',
  'content:approve',
  'content:publish',
  'facts:edit',
  'integrations:manage',
  'integrations:view_tokens',
  'billing:manage',
  'analytics:view',
  'team:manage',
  'ownership:transfer'
]);

export type Capability = z.infer<typeof CapabilitySchema>;
