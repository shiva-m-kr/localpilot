import { Organization } from '../schema/organizations.js';
import { Business } from '../schema/businesses.js';
import { Location } from '../schema/locations.js';

// --- Fixture 1: Single-Location Service-Area Business (Residential/Hidden Address) ---
export const singleLocationOrg: Organization = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Apex Home Services Org',
  slug: 'apex-home-services',
  billingPlan: 'starter',
  currency: 'INR',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z')
};

export const singleLocationBusiness: Business = {
  id: '10000000-0000-0000-0000-000000000001',
  organizationId: singleLocationOrg.id,
  name: 'Apex Plumbing & HVAC',
  brandVoice: 'reliable_honest',
  primaryCategory: 'Plumber',
  websiteUrl: 'https://apexplumbing.example.in',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z')
};

export const singleLocationRecord: Location = {
  id: '20000000-0000-0000-0000-000000000001',
  organizationId: singleLocationOrg.id,
  businessId: singleLocationBusiness.id,
  name: 'Apex Plumbing Main Service Zone',
  countryCode: 'IN',
  timezone: 'Asia/Kolkata',
  language: 'en-IN',
  currency: 'INR',
  addressVisibility: 'HIDDEN_RESIDENTIAL', // Service-area business operates from residential premises
  streetAddress: '142 Private Residential Villa, HSR Layout Sector 2', // Sensitive residential address
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560102',
  latitude: '12.9116000',
  longitude: '77.6412000',
  publicPhone: '+91 80 4123 4567',
  publicEmail: 'contact@apexplumbing.example.in',
  bookingUrl: 'https://apexplumbing.example.in/book',
  privateOwnerPhone: '+91 98450 12345',
  privateBillingEmail: 'owner.personal@example.com',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z')
};

// --- Fixture 2: Multi-Location Business (Physical Storefronts) ---
export const multiLocationOrg: Organization = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Bella Wellness Group',
  slug: 'bella-wellness',
  billingPlan: 'growth',
  currency: 'INR',
  createdAt: new Date('2026-10-05T00:00:00Z'),
  updatedAt: new Date('2026-10-05T00:00:00Z')
};

export const multiLocationBusiness: Business = {
  id: '10000000-0000-0000-0000-000000000002',
  organizationId: multiLocationOrg.id,
  name: 'Bella Hair & Day Spa',
  brandVoice: 'luxurious_welcoming',
  primaryCategory: 'Beauty Salon',
  websiteUrl: 'https://bellaspa.example.in',
  createdAt: new Date('2026-10-05T00:00:00Z'),
  updatedAt: new Date('2026-10-05T00:00:00Z')
};

export const branchKoramangala: Location = {
  id: '20000000-0000-0000-0000-000000000002',
  organizationId: multiLocationOrg.id,
  businessId: multiLocationBusiness.id,
  name: 'Bella Spa Koramangala 4th Block',
  countryCode: 'IN',
  timezone: 'Asia/Kolkata',
  language: 'en-IN',
  currency: 'INR',
  addressVisibility: 'PUBLIC',
  streetAddress: '78 80-Feet Road, 4th Block, Koramangala',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560034',
  latitude: '12.9345000',
  longitude: '77.6265000',
  publicPhone: '+91 80 4987 6543',
  publicEmail: 'koramangala@bellaspa.example.in',
  bookingUrl: 'https://bellaspa.example.in/koramangala/book',
  privateOwnerPhone: '+91 99000 88888',
  privateBillingEmail: 'accounts@bellawellness.example.com',
  createdAt: new Date('2026-10-05T00:00:00Z'),
  updatedAt: new Date('2026-10-05T00:00:00Z')
};

export const branchIndiranagar: Location = {
  id: '20000000-0000-0000-0000-000000000003',
  organizationId: multiLocationOrg.id,
  businessId: multiLocationBusiness.id,
  name: 'Bella Spa 100-Ft Road Indiranagar',
  countryCode: 'IN',
  timezone: 'Asia/Kolkata',
  language: 'en-IN',
  currency: 'INR',
  addressVisibility: 'PUBLIC',
  streetAddress: '542 100-Feet Road, HAL 2nd Stage, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560038',
  latitude: '12.9784000',
  longitude: '77.6408000',
  publicPhone: '+91 80 4765 4321',
  publicEmail: 'indiranagar@bellaspa.example.in',
  bookingUrl: 'https://bellaspa.example.in/indiranagar/book',
  privateOwnerPhone: '+91 99000 88888',
  privateBillingEmail: 'accounts@bellawellness.example.com',
  createdAt: new Date('2026-10-05T00:00:00Z'),
  updatedAt: new Date('2026-10-05T00:00:00Z')
};

// --- Foreign Tenant (For cross-organization boundary tests) ---
export const foreignOrg: Organization = {
  id: '00000000-0000-0000-0000-000000000099',
  name: 'Foreign Cross-Tenant Org',
  slug: 'foreign-tenant',
  billingPlan: 'enterprise',
  currency: 'USD',
  createdAt: new Date('2026-10-10T00:00:00Z'),
  updatedAt: new Date('2026-10-10T00:00:00Z')
};

export const foreignBusiness: Business = {
  id: '10000000-0000-0000-0000-000000000099',
  organizationId: foreignOrg.id,
  name: 'Foreign Auto Group',
  brandVoice: 'corporate',
  primaryCategory: 'Auto Repair',
  websiteUrl: 'https://foreignauto.example.com',
  createdAt: new Date('2026-10-10T00:00:00Z'),
  updatedAt: new Date('2026-10-10T00:00:00Z')
};
