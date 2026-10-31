import { z } from 'zod';
import { LocationIdSchema, OrganizationIdSchema } from './identifiers.js';

export const SiteTemplateTypeSchema = z.enum([
  'SERVICE',      // Field services, contractors, emergency dispatch
  'APPOINTMENT',  // Healthcare, salon, consulting, scheduled visits
  'STOREFRONT',   // Retail, cafe, bakery, physical walk-in premises
]);
export type SiteTemplateType = z.infer<typeof SiteTemplateTypeSchema>;

export const SiteBlockTypeSchema = z.enum([
  'HERO',
  'SERVICES',
  'ABOUT',
  'HOURS',
  'CONTACT',
  'TESTIMONIALS',
  'SERVICE_AREA',
  'GALLERY',
]);
export type SiteBlockType = z.infer<typeof SiteBlockTypeSchema>;

export const BaseSiteBlockSchema = z.object({
  id: z.string().uuid(),
  type: SiteBlockTypeSchema,
  heading: z.string().max(200),
  subheading: z.string().max(500).optional(),
  orderIndex: z.number().int().min(0),
  isVisible: z.boolean().default(true),
});

export const HeroBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('HERO'),
  badgeText: z.string().max(100).optional(),
  headline: z.string().min(1).max(200),
  subheadline: z.string().max(500).optional(),
  primaryCtaText: z.string().max(50),
  primaryCtaLink: z.string().max(200),
  secondaryCtaText: z.string().max(50).optional(),
  secondaryCtaLink: z.string().max(200).optional(),
  backgroundImageUrl: z.string().url().optional(),
});
export type HeroBlock = z.infer<typeof HeroBlockSchema>;

export const ServiceItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  startingPrice: z.string().max(50).optional(),
  callToAction: z.string().max(50).optional(),
});
export type ServiceItem = z.infer<typeof ServiceItemSchema>;

export const ServicesBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('SERVICES'),
  services: z.array(ServiceItemSchema),
});
export type ServicesBlock = z.infer<typeof ServicesBlockSchema>;

export const AboutBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('ABOUT'),
  bio: z.string().min(1).max(4000),
  yearsInBusiness: z.number().int().min(0).optional(),
  ownerName: z.string().max(100).optional(),
  highlights: z.array(z.string().max(150)).default([]),
  photoUrl: z.string().url().optional(),
});
export type AboutBlock = z.infer<typeof AboutBlockSchema>;

export const HoursBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('HOURS'),
  note: z.string().max(200).optional(),
  emergency24x7: z.boolean().default(false),
});
export type HoursBlock = z.infer<typeof HoursBlockSchema>;

export const ContactBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('CONTACT'),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showAddress: z.boolean().default(true), // Subject to SAB address suppression
  bookingButtonText: z.string().max(50).optional(),
  bookingUrl: z.string().url().optional(),
});
export type ContactBlock = z.infer<typeof ContactBlockSchema>;

export const TestimonialItemSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().max(100),
  quote: z.string().max(1000),
  serviceRendered: z.string().max(100).optional(),
  dateIso: z.string().optional(),
  verifiedCustomer: z.boolean().default(false),
});
export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialsBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('TESTIMONIALS'),
  testimonials: z.array(TestimonialItemSchema),
});
export type TestimonialsBlock = z.infer<typeof TestimonialsBlockSchema>;

export const ServiceAreaMapBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('SERVICE_AREA'),
  coveredCities: z.array(z.string().max(100)),
  serviceRadiusKm: z.number().min(1).max(500).optional(),
  disclaimer: z.string().max(300).optional(),
});
export type ServiceAreaMapBlock = z.infer<typeof ServiceAreaMapBlockSchema>;

export const GalleryItemSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  altText: z.string().max(200),
  caption: z.string().max(300).optional(),
});
export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const GalleryBlockSchema = BaseSiteBlockSchema.extend({
  type: z.literal('GALLERY'),
  images: z.array(GalleryItemSchema),
});
export type GalleryBlock = z.infer<typeof GalleryBlockSchema>;

export const SiteBlockSchema = z.discriminatedUnion('type', [
  HeroBlockSchema,
  ServicesBlockSchema,
  AboutBlockSchema,
  HoursBlockSchema,
  ContactBlockSchema,
  TestimonialsBlockSchema,
  ServiceAreaMapBlockSchema,
  GalleryBlockSchema,
]);
export type SiteBlock = z.infer<typeof SiteBlockSchema>;

export const SiteThemeTokensSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#E0580C'), // Brand orange
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F97316'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFF7ED'), // Peach 50
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#1E293B'),
  fontFamilyHeading: z.string().default('Plus Jakarta Sans, sans-serif'),
  fontFamilyBody: z.string().default('Inter, sans-serif'),
  borderRadiusPx: z.number().int().min(0).max(32).default(12),
});
export type SiteThemeTokens = z.infer<typeof SiteThemeTokensSchema>;

export const SitePublicFactsSchema = z.object({
  businessName: z.string().min(1).max(200),
  tagline: z.string().max(250).optional(),
  category: z.string().max(100),
  phone: z.string().max(50),
  email: z.string().email().optional(),
  websiteUrl: z.string().url().optional(),
  // Location and SAB privacy
  isSAB: z.boolean().default(false),
  hasHiddenAddress: z.boolean().default(false),
  streetAddress: z.string().max(250).optional(),
  city: z.string().max(100),
  stateOrRegion: z.string().max(100),
  postalCode: z.string().max(30),
  country: z.string().length(2).default('IN'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  operatingHours: z.array(
    z.object({
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
      opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      isClosed: z.boolean().default(false),
    })
  ).default([]),
  serviceAreas: z.array(z.string()).default([]),
});
export type SitePublicFacts = z.infer<typeof SitePublicFactsSchema>;

export const SiteRevisionSchema = z.object({
  revisionId: z.string().uuid(),
  siteId: z.string().uuid(),
  templateType: SiteTemplateTypeSchema,
  templateVersion: z.number().int().min(1).default(1),
  theme: SiteThemeTokensSchema,
  blocks: z.array(SiteBlockSchema),
  metaTitle: z.string().max(150),
  metaDescription: z.string().max(320),
  createdAt: z.string().datetime(),
  createdByUserId: z.string().uuid(),
  isPublished: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
});
export type SiteRevision = z.infer<typeof SiteRevisionSchema>;

export const HostedSiteRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: OrganizationIdSchema,
  locationId: LocationIdSchema,
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/),
  customDomain: z.string().max(253).optional(),
  currentPublishedRevisionId: z.string().uuid().optional(),
  currentDraftRevisionId: z.string().uuid(),
  templateType: SiteTemplateTypeSchema,
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'PAUSED', 'DELETED']).default('ACTIVE'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type HostedSiteRecord = z.infer<typeof HostedSiteRecordSchema>;

export const RenderSiteRequestSchema = z.object({
  siteId: z.string().uuid(),
  isPreview: z.boolean().default(false),
  previewToken: z.string().optional(),
  host: z.string(),
});
export type RenderSiteRequest = z.infer<typeof RenderSiteRequestSchema>;

export const RenderedSiteHtmlSchema = z.object({
  siteId: z.string().uuid(),
  revisionId: z.string().uuid(),
  html: z.string(),
  statusCode: z.number().int().default(200),
  headers: z.record(z.string()),
  isPreview: z.boolean(),
  sanitized: z.boolean(),
  renderedAt: z.string().datetime(),
});
export type RenderedSiteHtml = z.infer<typeof RenderedSiteHtmlSchema>;
