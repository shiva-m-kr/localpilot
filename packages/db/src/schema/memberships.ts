import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('editor'),
  // Array of location UUIDs or null if user has organization-wide access
  authorizedLocationIds: jsonb('authorized_location_ids').$type<string[] | null>().default(null),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('idx_memberships_org_user').on(table.organizationId, table.userId),
  index('idx_memberships_user').on(table.userId)
]);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
