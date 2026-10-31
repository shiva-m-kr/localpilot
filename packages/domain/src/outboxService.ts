import crypto from 'crypto';
import {
  OutboxEvent,
  CommandRecord,
  CommandStatus,
  PollingStatusResponse,
  JobLane
} from '@localpilot/contracts';
import { QueueService } from './queueService.js';
import { ValidationFailedError } from './errors.js';

export interface CreateCommandWithEventInput {
  organizationId: string;
  commandType: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payloadVersion?: number;
  payload: Record<string, unknown>;
  targetLane: JobLane;
}

export class OutboxService {
  private static outboxEvents = new Map<string, OutboxEvent>();
  private static commands = new Map<string, CommandRecord>();
  private static dispatchedJobIds = new Set<string>();

  static clear(): void {
    this.outboxEvents.clear();
    this.commands.clear();
    this.dispatchedJobIds.clear();
  }

  /**
   * Records a command and its corresponding outbox event in an atomic unit.
   * In a SQL transaction, this is committed in the same BEGIN/COMMIT block as resource mutations.
   */
  static recordTransactionalCommand(input: CreateCommandWithEventInput): {
    command: CommandRecord;
    outboxEvent: OutboxEvent;
  } {
    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();
    const commandId = crypto.randomUUID();

    const outboxEvent: OutboxEvent = {
      id: eventId,
      organizationId: input.organizationId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payloadVersion: input.payloadVersion || 1,
      payload: {
        ...input.payload,
        targetLane: input.targetLane,
        commandId
      },
      status: 'pending',
      createdAt: now
    };

    const command: CommandRecord = {
      id: commandId,
      organizationId: input.organizationId,
      commandType: input.commandType,
      status: 'received',
      outboxEventId: eventId,
      createdAt: now,
      updatedAt: now
    };

    this.outboxEvents.set(eventId, outboxEvent);
    this.commands.set(commandId, command);

    return { command, outboxEvent };
  }

  /**
   * Replay-safe outbox dispatcher.
   * Dispatches all 'pending' outbox events to the background job queue.
   * If a crash occurred after DB commit, this sweeps up pending events safely.
   * Repeated runs do not create duplicate logical jobs.
   */
  static dispatchPendingEvents(): number {
    let dispatchedCount = 0;

    for (const event of this.outboxEvents.values()) {
      if (event.status !== 'pending') continue;

      // Deterministic logical job key derived from event id
      const logicalKey = `outbox-${event.id}`;
      if (this.dispatchedJobIds.has(logicalKey)) {
        // Already dispatched previously; mark as dispatched and continue
        event.status = 'dispatched';
        event.logicalJobId = logicalKey;
        continue;
      }

      const targetLane = (event.payload.targetLane as JobLane) || 'publication';

      // Enqueue to durable queue
      const job = QueueService.enqueue({
        organizationId: event.organizationId,
        lane: targetLane,
        jobType: event.eventType,
        payload: {
          ...event.payload,
          eventId: event.id,
          payloadVersion: event.payloadVersion
        }
      });

      this.dispatchedJobIds.add(logicalKey);
      event.status = 'dispatched';
      event.dispatchedAt = new Date().toISOString();
      event.logicalJobId = job.id;

      // Update corresponding command to processing
      const commandId = event.payload.commandId as string;
      if (commandId && this.commands.has(commandId)) {
        const cmd = this.commands.get(commandId)!;
        cmd.status = 'processing';
        cmd.updatedAt = new Date().toISOString();
      }

      dispatchedCount++;
    }

    return dispatchedCount;
  }

  /**
   * Updates a command status (e.g. called by worker upon job completion or failure).
   */
  static updateCommand(
    commandId: string,
    status: CommandStatus,
    result?: Record<string, unknown>,
    diagnostics?: Record<string, unknown>
  ): CommandRecord {
    const cmd = this.commands.get(commandId);
    if (!cmd) {
      throw new ValidationFailedError(`Command ${commandId} not found.`);
    }

    cmd.status = status;
    cmd.updatedAt = new Date().toISOString();
    cmd.result = result;
    cmd.diagnostics = diagnostics;

    return cmd;
  }

  /**
   * Retrieves polling status for client UI with calculated exponential backoff.
   */
  static getPollingStatus(commandId: string, pollCount: number = 1): PollingStatusResponse {
    const cmd = this.commands.get(commandId);
    if (!cmd) {
      throw new ValidationFailedError(`Command ${commandId} not found.`);
    }

    // Exponential backoff with ceiling: 1000ms -> 2000ms -> 4000ms -> max 8000ms
    const retryAfterMs = Math.min(8000, 1000 * Math.pow(2, Math.max(0, pollCount - 1)));

    return {
      commandId: cmd.id,
      status: cmd.status,
      retryAfterMs,
      result: cmd.result,
      diagnostics: cmd.diagnostics
    };
  }

  static getCommand(commandId: string): CommandRecord | null {
    return this.commands.get(commandId) || null;
  }

  static getOutboxEvent(eventId: string): OutboxEvent | null {
    return this.outboxEvents.get(eventId) || null;
  }
}
