import { pgTable, uuid, varchar, decimal, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { businesses } from './businesses.js';

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  
  // Regional & Localization Scope
  countryCode: varchar('country_code', { length: 2 }).notNull().default('IN'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Kolkata'),
  language: varchar('language', { length: 10 }).notNull().default('en-IN'),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  
  // Address & Residential Privacy Configuration
  addressVisibility: varchar('address_visibility', { length: 30 }).notNull().default('PUBLIC'), // PUBLIC | HIDDEN_RESIDENTIAL | SERVICE_AREA_ONLY
  streetAddress: varchar('street_address', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),

  // Public Contact Details (Visible on landing pages / citations)
  publicPhone: varchar('public_phone', { length: 50 }).notNull(),
  publicEmail: varchar('public_email', { length: 255 }),
  bookingUrl: varchar('booking_url', { length: 500 }),

  // Private Account Contact Details (Never shown publicly or exported)
  privateOwnerPhone: varchar('private_owner_phone', { length: 50 }),
  privateBillingEmail: varchar('private_billing_email', { length: 255 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('idx_locations_org_id').on(table.organizationId, table.id),
  index('idx_locations_org_business').on(table.organizationId, table.businessId),
  index('idx_locations_city_state').on(table.city, table.state)
]);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
