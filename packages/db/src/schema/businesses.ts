import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  brandVoice: varchar('brand_voice', { length: 50 }).notNull().default('professional_approachable'),
  primaryCategory: varchar('primary_category', { length: 100 }).notNull(),
  websiteUrl: varchar('website_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('idx_businesses_org_id').on(table.organizationId, table.id),
  index('idx_businesses_org').on(table.organizationId)
]);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
