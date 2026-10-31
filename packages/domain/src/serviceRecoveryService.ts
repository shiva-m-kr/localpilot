import { randomUUID } from 'crypto';
import {
  ServiceRecoveryCase,
  PrivateOperationalDetails,
  PolicyViolationEvidencePacket,
  ViolationReason,
  ReviewResource
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ServiceRecoveryService {
  private static cases = new Map<string, ServiceRecoveryCase>();
  private static packets = new Map<string, PolicyViolationEvidencePacket>();

  public static readonly REMOVAL_DISCLAIMER =
    'Submitting a policy violation report to Google does not guarantee removal. Google evaluates reviews under their independent Community Guidelines.';

  static reset(): void {
    this.cases.clear();
    this.packets.clear();
  }

  /**
   * Creates a private operational case for service recovery.
   * Enforces: Resolving a complaint is NEVER conditioned on changing a rating.
   */
  static createCase(params: {
    review: ReviewResource;
    assignedUserId: string;
    complaintSummary: string;
    privateDetails: PrivateOperationalDetails;
    isConditionedOnRatingChange?: boolean;
  }): ServiceRecoveryCase {
    // Acceptance rule: Resolving a complaint is not conditioned on changing a rating
    if (params.isConditionedOnRatingChange) {
      throw new ValidationFailedError(
        'Policy violation: Resolving customer complaints or honoring warranties cannot be conditioned on changing or removing a Google review.'
      );
    }

    const caseId = randomUUID();
    const nowIso = new Date().toISOString();

    const initialDraft =
      'Thank you for speaking with our team directly. We appreciate the opportunity to look into this and address your concerns.';

    const recoveryCase: ServiceRecoveryCase = {
      caseId,
      reviewResourceId: params.review.id,
      organizationId: params.review.organizationId,
      locationId: params.review.locationId,
      assignedUserId: params.assignedUserId,
      complaintSummary: params.complaintSummary,
      privateOperationalDetails: params.privateDetails,
      resolutionStatus: 'OPEN',
      isConditionedOnRatingChange: false,
      cautiousPublicDraft: initialDraft,
      resolvedAt: null,
      createdAt: nowIso
    };

    this.cases.set(caseId, recoveryCase);
    return recoveryCase;
  }

  /**
   * Confirms resolution of a recovery case and updates the cautious public draft.
   * Enforces:
   * 1. No private customer/order details are inserted into public response
   * 2. No fraud accusation is published
   */
  static confirmResolution(params: {
    caseId: string;
    status: 'RESOLVED_SATISFIED' | 'RESOLVED_UNRESPONSIVE';
    internalResolutionNotes: string;
    publicDraftText: string;
  }): ServiceRecoveryCase {
    const existing = this.cases.get(params.caseId);
    if (!existing) throw new ValidationFailedError(`Case ${params.caseId} not found.`);

    // 1. Check for prohibited fraud accusations in public draft
    const fraudRegex = /\b(fake (review|customer)|fraud|scam artist|bot|liar|paid competitor|competitor attack)\b/i;
    if (fraudRegex.test(params.publicDraftText)) {
      throw new ValidationFailedError(
        'Cannot publish reply draft: Public replies must remain professional and cannot contain fraud accusations.'
      );
    }

    // 2. Check for leaked private order/customer details
    const priv = existing.privateOperationalDetails;
    if (priv.orderNumber && params.publicDraftText.includes(priv.orderNumber)) {
      throw new ValidationFailedError('Privacy leak: Public draft must not contain internal order number.');
    }
    if (priv.invoiceAmount && params.publicDraftText.includes(priv.invoiceAmount)) {
      throw new ValidationFailedError('Privacy leak: Public draft must not contain private invoice amount.');
    }
    if (priv.customerDirectPhone && params.publicDraftText.includes(priv.customerDirectPhone)) {
      throw new ValidationFailedError('Privacy leak: Public draft must not contain customer personal phone number.');
    }

    existing.resolutionStatus = params.status;
    existing.privateOperationalDetails.internalResolutionNotes = params.internalResolutionNotes;
    existing.cautiousPublicDraft = params.publicDraftText;
    existing.resolvedAt = new Date().toISOString();

    this.cases.set(params.caseId, existing);
    return existing;
  }

  /**
   * Assembles a policy-violation evidence packet for reporting to Google.
   * Enforces:
   * 1. Negative reviews are not promised removal
   * 2. Fraud accusations are blocked from public reply publication
   */
  static buildPolicyViolationPacket(params: {
    review: ReviewResource;
    suspectedViolationReason: ViolationReason;
    evidenceNotes: string;
  }): PolicyViolationEvidencePacket {
    const packetId = randomUUID();
    const nowIso = new Date().toISOString();

    const providerReportingGuidanceUrl = `https://support.google.com/business/answer/4596773?hl=en&ref_topic=4596754`;

    const packet: PolicyViolationEvidencePacket = {
      packetId,
      reviewResourceId: params.review.id,
      organizationId: params.review.organizationId,
      locationId: params.review.locationId,
      suspectedViolationReason: params.suspectedViolationReason,
      evidenceNotes: params.evidenceNotes,
      providerReportingGuidanceUrl,
      removalGuaranteedDisclaimer: this.REMOVAL_DISCLAIMER,
      autoPublishFraudAccusationBlocked: true,
      createdAt: nowIso
    };

    this.packets.set(packetId, packet);
    return packet;
  }

  static getCase(caseId: string): ServiceRecoveryCase | undefined {
    return this.cases.get(caseId);
  }

  static getPacket(packetId: string): PolicyViolationEvidencePacket | undefined {
    return this.packets.get(packetId);
  }
}
