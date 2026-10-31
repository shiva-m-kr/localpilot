export type AutoReplyMode = 'OFF' | 'DRAFT_ONLY' | 'APPROVE_EACH' | 'ELIGIBLE_POSITIVE_AUTO';

export interface AutoReplyPolicyConfig {
  policyId: string;
  organizationId: string;
  locationId: string;
  provider: 'google_business_profile';
  mode: AutoReplyMode;
  ownerConsentRecordedAt: string | null;
  ownerConsentUserId: string | null;
  isConsentRevoked: boolean;
  languageAllowlist: string[];
  minDelayMinutes: number;
  dailyCap: number;
  todayAutoCount: number;
  providerRequirementsMet: boolean;
  updatedAt: string;
}

export interface AutoReplyEvaluation {
  isEligibleForAutoPublish: boolean;
  reason: string;
  scheduledPublishAt: string | null;
  requiredMode: AutoReplyMode;
}
