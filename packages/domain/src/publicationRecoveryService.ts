import { randomUUID } from 'crypto';
import {
  PublicationIncidentRecord,
  RecoveryIncidentType,
  RecoveryStatus,
  IncidentResolutionAction
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface RemoteResourceState {
  found: boolean;
  externalId?: string;
  remoteContentHash?: string;
  statusMessage?: string;
}

export class PublicationRecoveryService {
  private static incidents = new Map<string, PublicationIncidentRecord>();

  /**
   * Resets incident store (useful for test isolation).
   */
  static reset(): void {
    this.incidents.clear();
  }

  /**
   * Logs a new publication incident and returns record.
   */
  static recordIncident(params: {
    organizationId: string;
    locationId: string;
    provider: string;
    externalId?: string;
    incidentType: RecoveryIncidentType;
    expectedHash: string;
    errorSummary: string;
  }): PublicationIncidentRecord {
    const incidentId = randomUUID();
    const record: PublicationIncidentRecord = {
      incidentId,
      organizationId: params.organizationId,
      locationId: params.locationId,
      provider: params.provider,
      externalId: params.externalId,
      incidentType: params.incidentType,
      expectedHash: params.expectedHash,
      errorSummary: params.errorSummary,
      stepAttemptCount: 1,
      maxStepRetries: 3,
      status: 'NEEDS_OPERATOR_REVIEW',
      createdAt: new Date().toISOString()
    };

    this.incidents.set(incidentId, record);
    return record;
  }

  /**
   * Inspects remote provider before attempting any blind retry.
   * Protects remote edits and recovers without duplicate side effects.
   */
  static async reconcileBeforeRetry(
    incidentId: string,
    fetchRemoteFn: () => Promise<RemoteResourceState>
  ): Promise<{ incident: PublicationIncidentRecord; canProceedWithRetry: boolean; message: string }> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new ValidationFailedError(`Incident ${incidentId} not found.`);
    }

    const remote = await fetchRemoteFn();

    // 1. Remote write actually succeeded previously
    if (remote.found && remote.remoteContentHash === incident.expectedHash) {
      const updated: PublicationIncidentRecord = {
        ...incident,
        status: 'RECONCILED_SUCCESS',
        actualRemoteHash: remote.remoteContentHash,
        resolvedAt: new Date().toISOString()
      };
      this.incidents.set(incidentId, updated);
      return {
        incident: updated,
        canProceedWithRetry: false,
        message: 'Recovered: Post already exists on remote provider with matching content. No retry needed.'
      };
    }

    // 2. Remote post was edited directly on the platform (Drift Protection)
    if (remote.found && remote.remoteContentHash !== incident.expectedHash) {
      const updated: PublicationIncidentRecord = {
        ...incident,
        incidentType: 'REMOTE_CONTENT_DRIFT',
        actualRemoteHash: remote.remoteContentHash,
        status: 'NEEDS_OPERATOR_REVIEW',
        errorSummary: 'Remote content was modified directly on the external provider. Overwrite blocked.'
      };
      this.incidents.set(incidentId, updated);
      return {
        incident: updated,
        canProceedWithRetry: false,
        message: 'Conflict: Remote post was modified manually. Automated overwrite is blocked to protect author edits.'
      };
    }

    // 3. Post does not exist on remote provider: verify bounded retries
    if (incident.stepAttemptCount >= incident.maxStepRetries) {
      const updated: PublicationIncidentRecord = {
        ...incident,
        incidentType: 'DEAD_LETTER_JOB',
        status: 'NEEDS_OPERATOR_REVIEW',
        errorSummary: `Maximum step retries (${incident.maxStepRetries}) exceeded. Moved to dead-letter review.`
      };
      this.incidents.set(incidentId, updated);
      return {
        incident: updated,
        canProceedWithRetry: false,
        message: 'Dead-letter: Maximum retry limit reached. Human operator inspection required.'
      };
    }

    // Bounded step retry allowed
    const updated: PublicationIncidentRecord = {
      ...incident,
      stepAttemptCount: incident.stepAttemptCount + 1,
      status: 'RETRY_BOUNDED_STEP',
      updatedAt: new Date().toISOString()
    } as any;
    this.incidents.set(incidentId, updated);

    return {
      incident: updated,
      canProceedWithRetry: true,
      message: `Step retry ${updated.stepAttemptCount} of ${updated.maxStepRetries} permitted.`
    };
  }

  /**
   * Operator resolution actions.
   */
  static resolveIncident(
    incidentId: string,
    action: IncidentResolutionAction,
    operatorNotes?: string
  ): PublicationIncidentRecord {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new ValidationFailedError(`Incident ${incidentId} not found.`);
    }

    const now = new Date().toISOString();
    let nextStatus: RecoveryStatus = 'NEEDS_OPERATOR_REVIEW';

    switch (action) {
      case 'ADOPT_REMOTE_CONTENT':
        nextStatus = 'RECONCILED_SUCCESS';
        break;
      case 'CANCEL_DISPATCH':
        nextStatus = 'CANCELLED_BY_OPERATOR';
        break;
      case 'FORCE_RETRY_STEP':
        nextStatus = 'RETRY_BOUNDED_STEP';
        break;
      case 'RECONNECT_ACCOUNT':
        nextStatus = 'NEEDS_OPERATOR_REVIEW';
        break;
    }

    const updated: PublicationIncidentRecord = {
      ...incident,
      status: nextStatus,
      errorSummary: operatorNotes ? `${incident.errorSummary} | Note: ${operatorNotes}` : incident.errorSummary,
      resolvedAt: nextStatus !== 'NEEDS_OPERATOR_REVIEW' ? now : undefined
    };

    this.incidents.set(incidentId, updated);
    return updated;
  }

  /**
   * Safe UI status: unknown outcomes NEVER display "Published".
   */
  static getDisplayStatus(incident: PublicationIncidentRecord): {
    badge: 'warning' | 'failed' | 'published';
    label: string;
  } {
    if (incident.status === 'RECONCILED_SUCCESS') {
      return { badge: 'published', label: 'Verified Published' };
    }
    if (incident.status === 'CANCELLED_BY_OPERATOR') {
      return { badge: 'failed', label: 'Cancelled by Owner' };
    }
    if (incident.incidentType === 'TIMEOUT_AFTER_ACCEPTANCE') {
      return { badge: 'warning', label: 'Outcome Ambiguous - Pending Reconciliation' };
    }
    return { badge: 'failed', label: 'Needs Owner Intervention' };
  }
}
