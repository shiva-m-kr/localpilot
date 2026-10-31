import { ErrorCode, UISafeError } from '@localpilot/contracts';

export abstract class BaseDomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
  abstract readonly userAction: string;
  readonly remediationUrl?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>, remediationUrl?: string) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    this.remediationUrl = remediationUrl;
  }

  toUISafeError(): UISafeError {
    return {
      code: this.code,
      message: this.message,
      userAction: this.userAction,
      statusCode: this.statusCode,
      remediationUrl: this.remediationUrl,
      details: this.details
    };
  }
}

export class ReconnectRequiredError extends BaseDomainError {
  readonly code: ErrorCode = 'RECONNECT_REQUIRED';
  readonly statusCode: number = 401;
  readonly userAction: string = 'Please reconnect your integration account in Settings > Connections to refresh authorized permissions.';

  constructor(providerName: string, details?: Record<string, unknown>, remediationUrl?: string) {
    super(`Integration credentials for ${providerName} have expired or been revoked.`, details, remediationUrl);
  }
}

export class UnsupportedActionError extends BaseDomainError {
  readonly code: ErrorCode = 'UNSUPPORTED_ACTION';
  readonly statusCode: number = 422;
  readonly userAction: string = 'This operation is not supported by the external platform under your current account tier.';

  constructor(actionName: string, reason: string, details?: Record<string, unknown>) {
    super(`Action '${actionName}' is unsupported: ${reason}`, details);
  }
}

export class ApprovalRequiredError extends BaseDomainError {
  readonly code: ErrorCode = 'APPROVAL_REQUIRED';
  readonly statusCode: number = 403;
  readonly userAction: string = 'This change modifies sensitive business profile data or marketing content and requires explicit owner approval.';

  constructor(itemType: string, itemId: string, details?: Record<string, unknown>) {
    super(`Explicit approval required before proceeding with ${itemType} (ID: ${itemId}).`, details);
  }
}

export class QuotaExceededError extends BaseDomainError {
  readonly code: ErrorCode = 'QUOTA_EXCEEDED';
  readonly statusCode: number = 402;
  readonly userAction: string = 'You have reached your location credit allowance. Upgrade your subscription or add credits to run additional scans.';

  constructor(operation: string, required: number, available: number, details?: Record<string, unknown>) {
    super(`Operation '${operation}' requires ${required} credits, but only ${available} credits are available.`, details);
  }
}

export class StaleRevisionError extends BaseDomainError {
  readonly code: ErrorCode = 'STALE_REVISION';
  readonly statusCode: number = 409;
  readonly userAction: string = 'The content or underlying business facts have been modified since this was approved. Please review the updated diff and re-approve.';

  constructor(expectedVersion: number | string, actualVersion: number | string, details?: Record<string, unknown>) {
    super(`Stale revision detected. Content was approved for version ${expectedVersion}, but current version is ${actualVersion}.`, details);
  }
}

export class UnknownExternalOutcomeError extends BaseDomainError {
  readonly code: ErrorCode = 'UNKNOWN_EXTERNAL_OUTCOME';
  readonly statusCode: number = 504;
  readonly userAction: string = 'The external provider did not acknowledge final publication status. We have queued an automated reconciliation check rather than repeating the request.';

  constructor(provider: string, externalReference?: string, details?: Record<string, unknown>) {
    super(`External write outcome for ${provider} is ambiguous. Automated reconciliation scheduled.`, {
      ...details,
      externalReference
    });
  }
}

export class TenantAccessDeniedError extends BaseDomainError {
  readonly code: ErrorCode = 'TENANT_ACCESS_DENIED';
  readonly statusCode: number = 403;
  readonly userAction: string = 'You do not have permission to view or modify resources in this organization or location.';

  constructor(organizationId: string, locationId?: string, details?: Record<string, unknown>) {
    super(`Access denied for organization ${organizationId}${locationId ? ` / location ${locationId}` : ''}.`, details);
  }
}

export class ValidationFailedError extends BaseDomainError {
  readonly code: ErrorCode = 'VALIDATION_FAILED';
  readonly statusCode: number = 400;
  readonly userAction: string = 'Please correct the invalid fields and try again.';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ConflictError extends BaseDomainError {
  readonly code: ErrorCode = 'CONFLICT_DETECTED';
  readonly statusCode: number = 409;
  readonly userAction: string = 'The requested resource is already claimed or conflicts with an existing record.';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
