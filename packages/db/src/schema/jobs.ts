import { pgTable, text, timestamp, integer, jsonb, index, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { locations } from './locations.js';

export const backgroundJobs = pgTable(
  'background_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }),
    lane: text('lane', {
      enum: ['publication', 'reconciliation', 'generation', 'rankings', 'crawl_maintenance']
    }).notNull(),
    jobType: text('job_type').notNull(),
    priority: text('priority', { enum: ['critical', 'high', 'normal', 'low'] })
      .default('normal')
      .notNull(),
    status: text('status', {
      enum: ['queued', 'leased', 'running', 'completed', 'failed', 'cancelled']
    })
      .default('queued')
      .notNull(),
    payload: jsonb('payload').notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    runAt: timestamp('run_at', { withTimezone: true }).notNull(),
    leasedAt: timestamp('leased_at', { withTimezone: true }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    workerId: text('worker_id'),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    diagnostics: jsonb('diagnostics'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true })
  },
  (table) => ({
    laneStatusRunAtIndex: index('idx_jobs_lane_status_run_at').on(table.lane, table.status, table.runAt),
    orgLaneStatusIndex: index('idx_jobs_org_lane_status').on(table.organizationId, table.lane, table.status),
    leaseExpiryIndex: index('idx_jobs_lease_expiry').on(table.status, table.leaseExpiresAt)
  })
);
