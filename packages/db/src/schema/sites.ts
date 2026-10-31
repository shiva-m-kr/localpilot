import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { locations } from './locations.js';

/**
 * Private Drafts Table (Strictly Authenticated & Tenant Scoped)
 * Contains unconfirmed facts, internal revisions, author notes, and draft content.
 */
export const drafts = pgTable('drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  internalNotes: text('internal_notes'), // Private internal notes, never to be published
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  approvalStatus: varchar('approval_status', { length: 50 }).notNull().default('DRAFT'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('idx_drafts_org_location').on(table.organizationId, table.locationId)
]);

export type Draft = typeof drafts.$inferSelect;
export type NewDraft = typeof drafts.$inferInsert;

/**
 * Published Sites Read Projection (Publicly Accessible Projection)
 * Contains strictly sanitized, approved, public-facing website content.
 * Drafts, internal notes, and private credentials NEVER enter this table.
 */
export const publishedSites = pgTable('published_sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 150 }).notNull(),
  customDomain: varchar('custom_domain', { length: 255 }),
  renderedHtml: text('rendered_html').notNull(),
  metaTitle: varchar('meta_title', { length: 255 }).notNull(),
  metaDescription: text('meta_description'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  isLive: boolean('is_live').notNull().default(true)
}, (table) => [
  uniqueIndex('idx_published_sites_slug').on(table.slug),
  index('idx_published_sites_domain').on(table.customDomain),
  index('idx_published_sites_org_location').on(table.organizationId, table.locationId)
]);

export type PublishedSite = typeof publishedSites.$inferSelect;
export type NewPublishedSite = typeof publishedSites.$inferInsert;
