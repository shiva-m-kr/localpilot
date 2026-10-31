import { z } from 'zod';
import { ISO8601TimestampSchema } from './timestamps.js';

export const OnboardingPathSchema = z.enum([
  'existing-website',
  'gbp-first',
  'from-scratch'
]);
export type OnboardingPath = z.infer<typeof OnboardingPathSchema>;

export const AddressVisibilitySchema = z.enum([
  'PUBLIC',
  'HIDDEN_RESIDENTIAL',
  'SERVICE_AREA_ONLY'
]);
export type AddressVisibility = z.infer<typeof AddressVisibilitySchema>;

export const BookingGoalSchema = z.enum([
  'PHONE_CALL',
  'ONLINE_FORM',
  'BOOKING_LINK',
  'WALK_IN'
]);
export type BookingGoal = z.infer<typeof BookingGoalSchema>;

export const OperatingHoursSchema = z.record(
  z.string(), // Day of week (monday, tuesday, etc.)
  z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(), // '09:00'
    closeTime: z.string().optional() // '18:00'
  })
);
export type OperatingHours = z.infer<typeof OperatingHoursSchema>;

export const OnboardingDraftDataSchema = z.object({
  path: OnboardingPathSchema,
  
  // Step 1: Business Identity & Brand
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  primaryCategory: z.string().min(2, 'Category is required'),
  brandVoice: z.string().default('reliable_honest'),
  websiteUrl: z.string().url().optional().or(z.literal('')),

  // Step 2: Location & Address Privacy
  countryCode: z.string().length(2).default('IN'),
  timezone: z.string().default('Asia/Kolkata'),
  language: z.string().default('en-IN'),
  addressVisibility: AddressVisibilitySchema.default('PUBLIC'),
  streetAddress: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  serviceCoverageRadiusKm: z.number().int().positive().default(20),

  // Public Contact Details
  publicPhone: z.string().min(8, 'Valid phone number is required'),
  publicEmail: z.string().email().optional().or(z.literal('')),
  
  // Step 3: Operating Hours
  hours: OperatingHoursSchema.optional(),

  // Step 4: Services Offered
  services: z.array(z.string()).default([]),

  // Step 5: Booking Goal & Integrations
  bookingGoal: BookingGoalSchema.default('PHONE_CALL'),
  bookingUrl: z.string().url().optional().or(z.literal('')),
  skippedIntegrations: z.boolean().default(false)
});

export type OnboardingDraftData = z.infer<typeof OnboardingDraftDataSchema>;

export const OnboardingSessionSchema = z.object({
  sessionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  currentStep: z.number().int().min(1).max(5),
  completedSteps: z.array(z.number().int()),
  isCompleted: z.boolean().default(false),
  lastSavedAt: ISO8601TimestampSchema,
  data: OnboardingDraftDataSchema
});

export type OnboardingSession = z.infer<typeof OnboardingSessionSchema>;
