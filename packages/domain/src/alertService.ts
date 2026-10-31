import crypto from 'crypto';
import {
  AlertRecord,
  AlertType,
  AlertSeverity
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface CreateAlertInput {
  organizationId: string;
  locationId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  dedupKey: string;
  isPersistent?: boolean;
}

export class AlertService {
  private static alerts = new Map<string, AlertRecord>(); // alertId -> record
  private static dedupMap = new Map<string, string>(); // orgId:dedupKey -> alertId

  static clear(): void {
    this.alerts.clear();
    this.dedupMap.clear();
  }

  static publishAlert(input: CreateAlertInput): AlertRecord {
    // 1. Sanitize message to strip any raw secrets or tokens
    const sanitizedMessage = this.sanitizeMessage(input.message);
    const orgDedupKey = `${input.organizationId}:${input.dedupKey}`;
    const now = new Date().toISOString();

    // 2. Persistent rules: Pause and unresolved public writes MUST be persistent
    const isPersistent =
      input.isPersistent !== undefined
        ? input.isPersistent
        : input.type === 'PAUSE_ACTIVE' || input.type === 'UNKNOWN_OUTCOME';

    // 3. Deduplication: Check if active unacknowledged alert with same dedupKey exists
    const existingId = this.dedupMap.get(orgDedupKey);
    if (existingId) {
      const existing = this.alerts.get(existingId);
      if (existing && !existing.isAcknowledged) {
        // Increment occurrence count without spamming new notifications!
        existing.occurrenceCount += 1;
        existing.updatedAt = now;
        existing.message = sanitizedMessage;
        return existing;
      }
    }

    const id = crypto.randomUUID();
    const alert: AlertRecord = {
      id,
      organizationId: input.organizationId,
      locationId: input.locationId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: sanitizedMessage,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      dedupKey: input.dedupKey,
      isPersistent,
      isAcknowledged: false,
      occurrenceCount: 1,
      createdAt: now,
      updatedAt: now
    };

    this.alerts.set(id, alert);
    this.dedupMap.set(orgDedupKey, id);

    return alert;
  }

  /**
   * Dismisses or acknowledges an alert.
   * Persistent alerts cannot be dismissed if the underlying issue remains active.
   */
  static acknowledgeAlert(alertId: string, force: boolean = false): AlertRecord {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new ValidationFailedError(`Alert ${alertId} not found.`);
    }

    if (alert.isPersistent && !force) {
      throw new ValidationFailedError(
        `Persistent alert '${alert.title}' cannot be dismissed until the underlying operational condition is resolved.`
      );
    }

    alert.isAcknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.updatedAt = alert.acknowledgedAt;

    return alert;
  }

  static getActiveAlerts(organizationId: string): AlertRecord[] {
    const list: AlertRecord[] = [];
    for (const a of this.alerts.values()) {
      if (a.organizationId === organizationId && !a.isAcknowledged) {
        list.push(a);
      }
    }
    return list;
  }

  private static sanitizeMessage(msg: string): string {
    return msg
      .replace(/(?:bearer\s+|token[=:]\s*|key[=:]\s*|secret[=:]\s*)[a-zA-Z0-9_\-\.]{8,}/gi, '[REDACTED_SECRET]')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
  }
}
