export type ViolationReason =
  | 'OFF_TOPIC'
  | 'CONFLICT_OF_INTEREST'
  | 'HARASSMENT_HATE_SPEECH'
  | 'FAKE_ENGAGEMENT'
  | 'DEFAMATION_PERSONAL_ATTACK';

export interface PrivateOperationalDetails {
  orderNumber?: string;
  invoiceAmount?: string;
  customerDirectPhone?: string;
  internalResolutionNotes?: string;
}

export interface ServiceRecoveryCase {
  caseId: string;
  reviewResourceId: string;
  organizationId: string;
  locationId: string;
  assignedUserId: string;
  complaintSummary: string;
  privateOperationalDetails: PrivateOperationalDetails;
  resolutionStatus: 'OPEN' | 'INVESTIGATING' | 'RESOLVED_SATISFIED' | 'RESOLVED_UNRESPONSIVE';
  isConditionedOnRatingChange: boolean; // Must ALWAYS be false
  cautiousPublicDraft: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface PolicyViolationEvidencePacket {
  packetId: string;
  reviewResourceId: string;
  organizationId: string;
  locationId: string;
  suspectedViolationReason: ViolationReason;
  evidenceNotes: string;
  providerReportingGuidanceUrl: string;
  removalGuaranteedDisclaimer: string;
  autoPublishFraudAccusationBlocked: boolean;
  createdAt: string;
}
