import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema } from './identifiers.js';
import { CurrencyCodeSchema } from './money.js';

export const SubscriptionPlanTierSchema = z.enum([
  'STARTER_PILOT',  // ₹2,999 / $49 mo
  'PRO_BUSINESS',   // ₹5,999 / $99 mo
  'AGENCY_SCALE',   // ₹14,999 / $249 mo
]);
export type SubscriptionPlanTier = z.infer<typeof SubscriptionPlanTierSchema>;

export const SubscriptionStatusSchema = z.enum([
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  planTier: SubscriptionPlanTierSchema,
  status: SubscriptionStatusSchema.default('ACTIVE'),
  providerSubscriptionId: z.string(),
  providerCustomerId: z.string(),
  currency: CurrencyCodeSchema.default('INR'),
  monthlyAmountMinor: z.number().int().min(0),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean().default(false),
  canceledAt: z.string().datetime().optional(),
  isProductionAccount: z.boolean().default(false), // Distinguish sandbox from live
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SubscriptionRecord = z.infer<typeof SubscriptionRecordSchema>;

export const BillingWebhookEventSchema = z.object({
  eventId: z.string().min(5),
  eventType: z.enum([
    'subscription.activated',
    'subscription.charged',
    'subscription.payment_failed',
    'subscription.cancelled',
  ]),
  provider: z.enum(['RAZORPAY', 'STRIPE']),
  signature: z.string().min(10),
  timestamp: z.number(),
  payload: z.record(z.any()),
});
export type BillingWebhookEvent = z.infer<typeof BillingWebhookEventSchema>;

export const WebhookProcessingResultSchema = z.object({
  eventId: z.string(),
  status: z.enum(['PROCESSED', 'DUPLICATE_IGNORED', 'OUT_OF_ORDER_IGNORED', 'SIGNATURE_INVALID']),
  message: z.string(),
  newSubscriptionStatus: SubscriptionStatusSchema.optional(),
});
export type WebhookProcessingResult = z.infer<typeof WebhookProcessingResultSchema>;
