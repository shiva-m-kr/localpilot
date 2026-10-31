import { randomUUID } from 'crypto';
import {
  GbpPostPayload,
  GbpPostTopicType,
  GbpOfferSpec,
  GbpFieldProposal,
  GbpSensitiveFieldType
} from '@localpilot/contracts';
import { ApprovalRequiredError, ValidationFailedError } from './errors.js';

export interface SensitiveFieldAuditLog {
  auditId: string;
  proposalId: string;
  locationId: string;
  fieldType: GbpSensitiveFieldType;
  oldValue: string;
  newValue: string;
  approvedByUserId: string;
  appliedAt: string;
  truthInSeoDisclaimer: string;
}

export class GbpManagementService {
  private static proposals = new Map<string, GbpFieldProposal>();
  private static posts = new Map<string, GbpPostPayload>();
  private static auditLogs: SensitiveFieldAuditLog[] = [];

  static reset(): void {
    this.proposals.clear();
    this.posts.clear();
    this.auditLogs = [];
  }

  /**
   * Validates and creates a GBP post payload.
   * Rejects expired offers or invalid date windows.
   */
  static createPost(params: {
    organizationId: string;
    locationId: string;
    topicType: GbpPostTopicType;
    summary: string;
    callToAction?: { actionType: any; url?: string };
    offer?: GbpOfferSpec;
    mediaUrls?: string[];
  }): GbpPostPayload {
    // 1. Summary validation
    if (!params.summary || params.summary.trim().length < 10) {
      throw new ValidationFailedError('GBP post summary must be at least 10 characters.');
    }
    if (params.summary.length > 1500) {
      throw new ValidationFailedError('GBP post summary cannot exceed 1500 characters.');
    }

    // 2. Offer validation
    if (params.topicType === 'OFFER') {
      if (!params.offer) {
        throw new ValidationFailedError('Offer posts require offer specifications (startDate and endDate).');
      }

      const start = new Date(params.offer.startDate).getTime();
      const end = new Date(params.offer.endDate).getTime();
      const now = Date.now();

      if (start >= end) {
        throw new ValidationFailedError('Offer start date must be before end date.');
      }

      if (end <= now) {
        throw new ValidationFailedError('Cannot create an expired offer. End date must be in the future.');
      }
    }

    const nowIso = new Date().toISOString();
    const post: GbpPostPayload = {
      id: randomUUID(),
      organizationId: params.organizationId,
      locationId: params.locationId,
      topicType: params.topicType,
      summary: params.summary,
      callToAction: params.callToAction,
      offer: params.offer,
      mediaUrls: params.mediaUrls || [],
      status: 'DRAFT',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.posts.set(post.id, post);
    return post;
  }

  /**
   * Records a rejection from Google Business Profile API.
   * Keeps rejected post visible with reason instead of discarding it.
   */
  static recordPostRejection(postId: string, rejectionReason: string): GbpPostPayload {
    const post = this.posts.get(postId);
    if (!post) {
      throw new ValidationFailedError(`GBP post ${postId} not found.`);
    }

    const updated: GbpPostPayload = {
      ...post,
      status: 'REJECTED_BY_GBP',
      rejectionReason,
      updatedAt: new Date().toISOString()
    };

    this.posts.set(postId, updated);
    return updated;
  }

  /**
   * Proposes a sensitive profile field change (e.g. NAP, Hours, Categories).
   * Sensitive changes always start in PROPOSED status and require explicit approval.
   */
  static proposeSensitiveFieldChange(params: {
    organizationId: string;
    locationId: string;
    fieldType: GbpSensitiveFieldType;
    currentValue: string;
    proposedValue: string;
    rationale: string;
  }): GbpFieldProposal {
    if (params.currentValue === params.proposedValue) {
      throw new ValidationFailedError('Proposed value is identical to current value.');
    }

    const proposalId = randomUUID();
    const proposal: GbpFieldProposal = {
      proposalId,
      organizationId: params.organizationId,
      locationId: params.locationId,
      fieldType: params.fieldType,
      currentValue: params.currentValue,
      proposedValue: params.proposedValue,
      rationale: params.rationale,
      status: 'PROPOSED',
      createdAt: new Date().toISOString()
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  /**
   * Approves a sensitive field proposal.
   */
  static approveProposal(proposalId: string, approvedByUserId: string): GbpFieldProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new ValidationFailedError(`Proposal ${proposalId} not found.`);
    }

    const updated: GbpFieldProposal = {
      ...proposal,
      status: 'APPROVED',
      approvedByUserId
    };

    this.proposals.set(proposalId, updated);
    return updated;
  }

  /**
   * Applies an approved sensitive field change to the business profile.
   * Enforces that proposal must be APPROVED; throws ApprovalRequiredError otherwise.
   * Logs audit trail with explicit Truth-in-SEO disclaimer.
   */
  static applySensitiveFieldProposal(proposalId: string): SensitiveFieldAuditLog {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new ValidationFailedError(`Proposal ${proposalId} not found.`);
    }

    if (proposal.status !== 'APPROVED' || !proposal.approvedByUserId) {
      throw new ApprovalRequiredError(
        'GBP sensitive field update',
        proposalId,
        { fieldType: proposal.fieldType, status: proposal.status }
      );
    }

    const nowIso = new Date().toISOString();
    const updated: GbpFieldProposal = {
      ...proposal,
      status: 'APPLIED',
      appliedAt: nowIso
    };
    this.proposals.set(proposalId, updated);

    const auditLog: SensitiveFieldAuditLog = {
      auditId: randomUUID(),
      proposalId: proposal.proposalId,
      locationId: proposal.locationId,
      fieldType: proposal.fieldType,
      oldValue: proposal.currentValue,
      newValue: proposal.proposedValue,
      approvedByUserId: proposal.approvedByUserId,
      appliedAt: nowIso,
      truthInSeoDisclaimer: 'Profile change verified and logged. LocalPilot does not promise or guarantee rank increases resulting from profile updates.'
    };

    this.auditLogs.push(auditLog);
    return auditLog;
  }

  static getAuditLogs(): SensitiveFieldAuditLog[] {
    return [...this.auditLogs];
  }
}
