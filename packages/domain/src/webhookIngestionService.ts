import crypto from 'crypto';
import {
  WebhookInboxRecord,
  WebhookProvider
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface IngestWebhookInput {
  provider: WebhookProvider;
  rawPayload: string; // Raw request body
  headers: Record<string, string | undefined>;
  appSecret: string;
}

export class WebhookIngestionService {
  private static inbox = new Map<string, WebhookInboxRecord>(); // inboxId -> record
  private static eventIdToInboxId = new Map<string, string>(); // provider:eventId -> inboxId

  static clear(): void {
    this.inbox.clear();
    this.eventIdToInboxId.clear();
  }

  /**
   * Validates provider signature, deduplicates replayed events, computes retention policy,
   * and durably stores the event in the inbox for asynchronous background processing.
   */
  static ingestWebhook(input: IngestWebhookInput): {
    acknowledged: boolean;
    inboxRecord: WebhookInboxRecord;
    isDuplicate: boolean;
  } {
    // 1. Provider Signature Verification
    if (input.provider === 'meta') {
      const signature = input.headers['x-hub-signature-256'];
      if (!signature) {
        throw new ValidationFailedError('Missing X-Hub-Signature-256 header.');
      }

      const expected = `sha256=${crypto
        .createHmac('sha256', input.appSecret)
        .update(input.rawPayload)
        .digest('hex')}`;

      if (signature !== expected) {
        throw new ValidationFailedError('Forged Meta webhook signature.');
      }
    } else if (input.provider === 'google_pubsub') {
      const authHeader = input.headers['authorization'];
      if (!authHeader || authHeader !== `Bearer ${input.appSecret}`) {
        throw new ValidationFailedError('Invalid Google Cloud Pub/Sub authorization token.');
      }
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(input.rawPayload);
    } catch {
      throw new ValidationFailedError('Malformed webhook JSON payload.');
    }

    // 2. Extract Event Identity
    const eventId =
      parsedPayload.id ||
      parsedPayload.entry?.[0]?.id ||
      parsedPayload.message?.messageId ||
      crypto.randomUUID();

    const dedupKey = `${input.provider}:${eventId}`;

    // 3. Replay Deduplication: If already received, do not process twice!
    if (this.eventIdToInboxId.has(dedupKey)) {
      const existingId = this.eventIdToInboxId.get(dedupKey)!;
      const existing = this.inbox.get(existingId)!;
      return { acknowledged: true, inboxRecord: existing, isDuplicate: true };
    }

    // 4. Source-Specific Retention:
    // GBP API data retention max 30 days per policy; Meta 7 days; others 14 days
    const retentionDays =
      input.provider === 'google_pubsub' ? 30 : input.provider === 'meta' ? 7 : 14;

    const now = Date.now();
    const receivedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + retentionDays * 86400 * 1000).toISOString();

    const id = crypto.randomUUID();
    const record: WebhookInboxRecord = {
      id,
      provider: input.provider,
      eventId,
      organizationId: parsedPayload.organizationId,
      payload: parsedPayload,
      status: 'received',
      retentionDays,
      receivedAt,
      expiresAt
    };

    this.inbox.set(id, record);
    this.eventIdToInboxId.set(dedupKey, id);

    return { acknowledged: true, inboxRecord: record, isDuplicate: false };
  }

  /**
   * Background processor processes received inbox records.
   */
  static processInboxRecord(inboxId: string): WebhookInboxRecord {
    const record = this.inbox.get(inboxId);
    if (!record) {
      throw new ValidationFailedError(`Inbox record ${inboxId} not found.`);
    }

    record.status = 'processed';
    record.processedAt = new Date().toISOString();
    return record;
  }

  static getInboxRecord(inboxId: string): WebhookInboxRecord | null {
    return this.inbox.get(inboxId) || null;
  }
}
