import { pgTable, text, timestamp, integer, jsonb, index, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payloadVersion: integer('payload_version').default(1).notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status', { enum: ['pending', 'dispatched', 'failed'] })
      .default('pending')
      .notNull(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    logicalJobId: text('logical_job_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusCreatedAtIdx: index('idx_outbox_status_created_at').on(table.status, table.createdAt),
    orgAggregateIdx: index('idx_outbox_org_aggregate').on(table.organizationId, table.aggregateType, table.aggregateId)
  })
);

export const transactionalCommands = pgTable(
  'transactional_commands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    commandType: text('command_type').notNull(),
    status: text('status', { enum: ['received', 'processing', 'completed', 'failed'] })
      .default('received')
      .notNull(),
    outboxEventId: uuid('outbox_event_id')
      .notNull()
      .references(() => outboxEvents.id, { onDelete: 'cascade' }),
    result: jsonb('result'),
    diagnostics: jsonb('diagnostics'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orgCommandStatusIdx: index('idx_cmd_org_status').on(table.organizationId, table.status)
  })
);
