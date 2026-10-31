import { z } from 'zod';
import { OrganizationIdSchema, LocationIdSchema } from './identifiers.js';

export const LeadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CLOSED_WON',
  'SPAM',
  'ARCHIVED',
]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadDeliveryStatusSchema = z.enum([
  'RECEIVED',
  'NOTIFIED_OWNER',
  'FAILED_NOTIFICATION',
  'DELIVERED',
]);
export type LeadDeliveryStatus = z.infer<typeof LeadDeliveryStatusSchema>;

export const AttributionEventTypeSchema = z.enum([
  'CALL_CLICK',
  'DIRECTIONS_CLICK',
  'WHATSAPP_CLICK',
  'FORM_SUBMIT',
  'QUALIFIED_LEAD',
]);
export type AttributionEventType = z.infer<typeof AttributionEventTypeSchema>;

export const LeadRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  siteId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional(),
  serviceInterest: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
  status: LeadStatusSchema.default('NEW'),
  deliveryStatus: LeadDeliveryStatusSchema.default('RECEIVED'),
  consentGiven: z.boolean(),
  consentTimestamp: z.string().datetime(),
  retentionExpiresAt: z.string().datetime(),
  attributionSource: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  isQualifiedLead: z.boolean().default(false),
  spamScore: z.number().min(0).max(1).default(0),
  createdAt: z.string().datetime(),
});
export type LeadRecord = z.infer<typeof LeadRecordSchema>;

export const SubmitLeadFormRequestSchema = z.object({
  siteId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional(),
  serviceInterest: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
  honeypot: z.string().default(''), // Must remain blank (anti-spam)
  consentGiven: z.boolean().refine(val => val === true, {
    message: 'Explicit consent to be contacted is required.',
  }),
  clientIp: z.string().optional(),
  utmSource: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});
export type SubmitLeadFormRequest = z.infer<typeof SubmitLeadFormRequestSchema>;

export const HonestAttributionReportSchema = z.object({
  locationId: LocationIdSchema,
  siteId: z.string().uuid(),
  windowDays: z.number().int().default(30),
  callButtonClicks: z.number().int().min(0),
  directionsClicks: z.number().int().min(0),
  whatsappClicks: z.number().int().min(0),
  formSubmissionsTotal: z.number().int().min(0),
  spamFormsRejected: z.number().int().min(0),
  verifiedQualifiedLeads: z.number().int().min(0),
  attributionDisclaimer: z.string(),
});
export type HonestAttributionReport = z.infer<typeof HonestAttributionReportSchema>;
