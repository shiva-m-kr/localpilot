export type RaceConditionType =
  | 'STALE_SOURCE_MODIFIED_DURING_WAIT'
  | 'MANUAL_PROVIDER_REPLY_DETECTED'
  | 'RESOURCE_REMOVED_OR_DELETED'
  | 'CONSENT_REVOKED_INFLIGHT'
  | 'INTEGRATION_TOKEN_LOST'
  | 'WORKER_LEASE_ACQUISITION_FAILED';

export interface ReviewReplyLease {
  leaseId: string;
  reviewResourceId: string;
  workerId: string;
  acquiredAt: string;
  expiresAt: string;
  leaseVersion: number;
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED';
}

export interface RaceDiagnostic {
  raceConditionDetected: boolean;
  conditionType: RaceConditionType | null;
  diagnosticMessage: string;
  recoveryAction: 'PAUSE_JOB' | 'ABORT_INFLIGHT' | 'ENTER_RECONCILIATION';
}
