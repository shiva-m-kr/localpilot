import { z } from 'zod';
import { LocationIdSchema } from './identifiers.js';

export const AuthorityOpportunityTypeSchema = z.enum([
  'TRADE_ASSOCIATION',    // Licensed trade guilds, builder associations, professional bar
  'SUPPLIER_DISTRIBUTOR',  // Authorized dealer/installer locators
  'COMMUNITY_PARTNER',    // Local youth sports, charity, community chamber
  'EDITORIAL_PR',         // Local press, expert commentary, neighborhood guide
  'AI_AGGREGATOR',        // High-trust knowledge bases queried by LLM answer engines
]);
export type AuthorityOpportunityType = z.infer<typeof AuthorityOpportunityTypeSchema>;

export const AuthorityPlacementCostSchema = z.enum([
  'FREE',
  'ANNUAL_MEMBERSHIP',
  'EVENT_SPONSORSHIP',
  'PURCHASE_VERIFICATION',
]);
export type AuthorityPlacementCost = z.infer<typeof AuthorityPlacementCostSchema>;

export const LocalAuthorityOpportunitySchema = z.object({
  id: z.string().uuid(),
  locationId: LocationIdSchema,
  opportunityType: AuthorityOpportunityTypeSchema,
  title: z.string().min(5).max(200),
  organizationName: z.string().min(2).max(100),
  domain: z.string().min(3).max(100),
  evidenceSource: z.string().max(500),
  relevanceRationale: z.string().max(1000),
  costType: AuthorityPlacementCostSchema,
  costDisclosure: z.string().max(200),
  actionGuidance: z.string().max(2000),
  isAutomatedOutreachBlocked: z.boolean().default(true), // Policy: NO automated cold spam outreach
  status: z.enum(['OPPORTUNITY_IDENTIFIED', 'OWNER_ACCEPTED', 'OUTREACH_COMPLETED', 'DECLINED']).default('OPPORTUNITY_IDENTIFIED'),
  disclaimer: z.string().max(400),
  createdAt: z.string().datetime(),
});
export type LocalAuthorityOpportunity = z.infer<typeof LocalAuthorityOpportunitySchema>;

export const CreateAuthorityTaskRequestSchema = z.object({
  locationId: LocationIdSchema,
  businessVertical: z.string(),
  city: z.string(),
  confirmedCertifications: z.array(z.string()).default([]),
  confirmedSuppliers: z.array(z.string()).default([]),
});
export type CreateAuthorityTaskRequest = z.infer<typeof CreateAuthorityTaskRequestSchema>;
