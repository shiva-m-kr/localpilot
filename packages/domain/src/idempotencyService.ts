import crypto from 'crypto';
import {
  IdempotencyRecord,
  OperationFailureCategory,
  ProviderWriteOutcome
} from '@localpilot/contracts';
import { QueueService } from './queueService.js';
import {
  ValidationFailedError,
  ReconnectRequiredError,
  UnknownExternalOutcomeError
} from './errors.js';

export class IdempotencyService {
  private static records = new Map<string, IdempotencyRecord>();

  static clear(): void {
    this.records.clear();
  }

  /**
   * Registers or retrieves an idempotent operation.
   * If existing completed/in_progress record found, returns it immediately.
   */
  static getOrCreateOperation(
    key: string,
    organizationId: string,
    ttlSeconds: number = 86400
  ): { isNew: boolean; record: IdempotencyRecord } {
    const existing = this.records.get(key);
    const now = Date.now();

    if (existing) {
      if (new Date(existing.expiresAt).getTime() > now) {
        return { isNew: false, record: existing };
      }
    }

    const commandId = crypto.randomUUID();
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + ttlSeconds * 1000).toISOString();

    const record: IdempotencyRecord = {
      key,
      organizationId,
      commandId,
      status: 'in_progress',
      attemptCount: 1,
      createdAt,
      expiresAt
    };

    this.records.set(key, record);
    return { isNew: true, record };
  }

  static completeOperation(key: string, result: Record<string, unknown>): IdempotencyRecord {
    const record = this.records.get(key);
    if (!record) {
      throw new ValidationFailedError(`Operation key ${key} not found.`);
    }

    record.status = 'completed';
    record.result = result;
    return record;
  }

  static failOperation(key: string, category: OperationFailureCategory): IdempotencyRecord {
    const record = this.records.get(key);
    if (!record) {
      throw new ValidationFailedError(`Operation key ${key} not found.`);
    }

    record.status = 'failed';
    record.failureCategory = category;
    return record;
  }

  /**
   * Classifies provider responses and detects task-level errors even when HTTP transport reports HTTP 200 OK.
   */
  static classifyProviderOutcome(
    httpStatusCode: number,
    responseBody: any,
    isTimeoutOrNetworkError: boolean = false
  ): ProviderWriteOutcome {
    // 1. Ambiguous external write (Timeout during write/POST operation)
    if (isTimeoutOrNetworkError) {
      return {
        status: 'ambiguous',
        rawTransportSuccess: false,
        httpStatusCode: 504,
        failureCategory: 'AMBIGUOUS_EXTERNAL_WRITE',
        userAction: 'Operation timed out during external write. Reconciling rather than blindly re-posting.',
        reconciliationRequired: true
      };
    }

    // 2. Check task-level errors inside HTTP 200 response (common in Meta Graph API & WP REST API)
    if (httpStatusCode === 200 && responseBody) {
      // Check Facebook / Meta OAuth error inside 200 response
      if (responseBody.error?.code === 190 || responseBody.error?.type === 'OAuthException') {
        return {
          status: 'failed',
          rawTransportSuccess: true, // HTTP 200 was received!
          httpStatusCode: 200,
          failureCategory: 'AUTHORIZATION',
          userAction: 'Integration access token has expired or been revoked. Reconnect required.',
          reconciliationRequired: false
        };
      }

      // Check validation error in 200 response
      if (responseBody.error?.code === 'validation_failed' || responseBody.code === 'rest_invalid_param') {
        return {
          status: 'failed',
          rawTransportSuccess: true,
          httpStatusCode: 200,
          failureCategory: 'VALIDATION',
          userAction: 'Invalid parameters rejected by provider.',
          reconciliationRequired: false
        };
      }

      // True success
      return {
        status: 'success',
        rawTransportSuccess: true,
        httpStatusCode: 200,
        externalId: responseBody.id || responseBody.externalId,
        reconciliationRequired: false
      };
    }

    // 3. HTTP status-based error classification
    if (httpStatusCode === 401 || httpStatusCode === 403) {
      return {
        status: 'failed',
        rawTransportSuccess: false,
        httpStatusCode,
        failureCategory: 'AUTHORIZATION',
        userAction: 'Integration authentication failed. Please reconnect your account.',
        reconciliationRequired: false
      };
    }

    if (httpStatusCode === 429) {
      return {
        status: 'failed',
        rawTransportSuccess: false,
        httpStatusCode,
        failureCategory: 'RATE_LIMIT',
        userAction: 'Provider rate limit reached. Backoff with jitter applied.',
        reconciliationRequired: false
      };
    }

    if (httpStatusCode >= 500) {
      return {
        status: 'failed',
        rawTransportSuccess: false,
        httpStatusCode,
        failureCategory: 'TRANSIENT_NETWORK',
        userAction: 'External provider server error. Retrying with capped backoff and jitter.',
        reconciliationRequired: false
      };
    }

    return {
      status: 'failed',
      rawTransportSuccess: false,
      httpStatusCode,
      failureCategory: 'VALIDATION',
      userAction: 'Request failed validation.',
      reconciliationRequired: false
    };
  }

  /**
   * Calculates exponential backoff with random jitter to avoid thundering herd.
   */
  static calculateBackoffWithJitter(
    attempt: number,
    baseMs: number = 1000,
    maxMs: number = 30000,
    jitterFactor: number = 0.25
  ): number {
    const rawBackoff = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
    const jitterRange = rawBackoff * jitterFactor;
    // Add deterministic pseudo-random jitter
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.round(Math.max(baseMs, Math.min(maxMs, rawBackoff + jitter)));
  }

  /**
   * Schedules automated reconciliation for ambiguous writes instead of blindly retrying write.
   */
  static scheduleReconciliation(
    organizationId: string,
    operationKey: string,
    provider: string,
    externalRef?: string
  ): string {
    const job = QueueService.enqueue({
      organizationId,
      lane: 'reconciliation',
      jobType: 'reconcile_external_write',
      payload: {
        operationKey,
        provider,
        externalRef,
        scheduledAt: new Date().toISOString()
      }
    });

    return job.id;
  }
}
