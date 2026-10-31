import { randomUUID, createHash } from 'crypto';
import {
  ReviewResource,
  EphemeralReviewAssessment,
  OwnerReplyDraft,
  ReplyApproval,
  ReplyPublicationAttempt,
  ReviewProvider,
  ReviewExistingReply
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ReviewService {
  private static reviewResources = new Map<string, ReviewResource>();
  private static assessments = new Map<string, EphemeralReviewAssessment>();
  private static replyDrafts = new Map<string, OwnerReplyDraft>();
  private static approvals = new Map<string, ReplyApproval>();
  private static publicationAttempts = new Map<string, ReplyPublicationAttempt>();

  // Strict 30-day retention window for GBP / external review cache and assessments
  public static readonly RETENTION_DAYS = 30;

  static reset(): void {
    this.reviewResources.clear();
    this.assessments.clear();
    this.replyDrafts.clear();
    this.approvals.clear();
    this.publicationAttempts.clear();
  }

  static computeSourceRevision(rating: number, comment: string | null): string {
    return createHash('sha256')
      .update(`${rating}:${comment ?? ''}`)
      .digest('hex');
  }

  /**
   * Ingests or updates a review resource in the cache with bounded expiry.
   */
  static upsertReviewResource(params: {
    organizationId: string;
    locationId: string;
    provider: ReviewProvider;
    externalResourceId: string;
    reviewerName: string;
    rating: number;
    comment: string | null;
    existingReply?: ReviewExistingReply | null;
    fetchedAtIso?: string;
  }): { resource: ReviewResource; revisionChanged: boolean } {
    if (params.rating < 1 || params.rating > 5) {
      throw new ValidationFailedError(`Rating must be between 1 and 5, received ${params.rating}`);
    }

    const fetchedAt = params.fetchedAtIso || new Date().toISOString();
    const fetchedTime = new Date(fetchedAt).getTime();
    const expiresAt = new Date(fetchedTime + this.RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const sourceRevision = this.computeSourceRevision(params.rating, params.comment);

    // Look for existing review by provider & external resource ID
    let existing: ReviewResource | undefined;
    for (const r of this.reviewResources.values()) {
      if (
        r.organizationId === params.organizationId &&
        r.locationId === params.locationId &&
        r.provider === params.provider &&
        r.externalResourceId === params.externalResourceId
      ) {
        existing = r;
        break;
      }
    }

    let revisionChanged = false;

    if (existing) {
      if (existing.sourceRevision !== sourceRevision) {
        revisionChanged = true;
        // Invalidate prior ephemeral assessments because source revision changed
        for (const [id, assessment] of this.assessments.entries()) {
          if (assessment.reviewResourceId === existing.id) {
            this.assessments.delete(id);
          }
        }
        // Mark pending drafts as STALE
        for (const draft of this.replyDrafts.values()) {
          if (draft.reviewResourceId === existing.id && draft.status === 'DRAFT') {
            draft.status = 'STALE';
            draft.updatedAt = fetchedAt;
          }
        }
      }

      existing.rating = params.rating;
      existing.comment = params.comment;
      existing.reviewerName = params.reviewerName;
      existing.sourceRevision = sourceRevision;
      existing.fetchedAt = fetchedAt;
      existing.expiresAt = expiresAt;
      existing.existingReply = params.existingReply ?? existing.existingReply;
      existing.isDeleted = false;
      existing.purgedAt = null;

      this.reviewResources.set(existing.id, existing);
      return { resource: existing, revisionChanged };
    }

    const id = randomUUID();
    const resource: ReviewResource = {
      id,
      organizationId: params.organizationId,
      locationId: params.locationId,
      provider: params.provider,
      externalResourceId: params.externalResourceId,
      reviewerName: params.reviewerName,
      rating: params.rating,
      comment: params.comment,
      sourceRevision,
      fetchedAt,
      expiresAt,
      existingReply: params.existingReply ?? null,
      isDeleted: false,
      purgedAt: null
    };

    this.reviewResources.set(id, resource);
    return { resource, revisionChanged: false };
  }

  /**
   * Records an ephemeral assessment tied strictly to the source revision and expiry window.
   */
  static recordAssessment(params: {
    reviewResourceId: string;
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    topics: string[];
    riskFlags: string[];
    language: string;
    confidence: number;
  }): EphemeralReviewAssessment {
    const resource = this.reviewResources.get(params.reviewResourceId);
    if (!resource) throw new ValidationFailedError(`Review resource ${params.reviewResourceId} not found.`);

    const id = randomUUID();
    const assessment: EphemeralReviewAssessment = {
      id,
      reviewResourceId: params.reviewResourceId,
      sourceRevision: resource.sourceRevision,
      sentiment: params.sentiment,
      topics: params.topics,
      riskFlags: params.riskFlags,
      language: params.language,
      confidence: params.confidence,
      expiresAt: resource.expiresAt
    };

    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * Creates an owner-authored or AI-assisted reply draft, retaining clear provenance.
   */
  static createReplyDraft(params: {
    organizationId: string;
    locationId: string;
    reviewResourceId: string;
    draftText: string;
    authorType: 'OWNER' | 'AI_ASSISTED' | 'STAFF';
    authorUserId: string;
  }): OwnerReplyDraft {
    const resource = this.reviewResources.get(params.reviewResourceId);
    if (!resource) throw new ValidationFailedError(`Review resource ${params.reviewResourceId} not found.`);

    const id = randomUUID();
    const nowIso = new Date().toISOString();
    const draft: OwnerReplyDraft = {
      id,
      organizationId: params.organizationId,
      locationId: params.locationId,
      reviewResourceId: params.reviewResourceId,
      sourceRevisionHash: resource.sourceRevision,
      draftText: params.draftText,
      authorType: params.authorType,
      authorUserId: params.authorUserId,
      version: 1,
      status: 'DRAFT',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.replyDrafts.set(id, draft);
    return draft;
  }

  /**
   * Approves a reply draft, checking that it matches the current source revision.
   */
  static approveReplyDraft(params: {
    draftId: string;
    approvedByUserId: string;
    consentScope: string;
  }): ReplyApproval {
    const draft = this.replyDrafts.get(params.draftId);
    if (!draft) throw new ValidationFailedError(`Draft ${params.draftId} not found.`);

    const resource = this.reviewResources.get(draft.reviewResourceId);
    if (!resource) throw new ValidationFailedError(`Review resource ${draft.reviewResourceId} not found.`);

    if (draft.sourceRevisionHash !== resource.sourceRevision) {
      draft.status = 'STALE';
      throw new ValidationFailedError(
        'Cannot approve draft: The external review was updated since this draft was generated (revision mismatch).'
      );
    }

    draft.status = 'APPROVED';
    draft.updatedAt = new Date().toISOString();

    const approval: ReplyApproval = {
      id: randomUUID(),
      draftId: draft.id,
      approvedByUserId: params.approvedByUserId,
      approvedAt: new Date().toISOString(),
      consentScope: params.consentScope,
      approvedRevisionHash: draft.sourceRevisionHash
    };

    this.approvals.set(approval.id, approval);
    return approval;
  }

  /**
   * Enforces retention policy: purges external review cache and ephemeral assessments older than 30 days.
   * Preserves owner-authored work separately while clearing restricted third-party content.
   */
  static purgeExpiredContent(asOfDateIso = new Date().toISOString()): {
    purgedResources: number;
    purgedAssessments: number;
  } {
    const asOfTime = new Date(asOfDateIso).getTime();
    let purgedResources = 0;
    let purgedAssessments = 0;

    for (const [id, resource] of this.reviewResources.entries()) {
      const expTime = new Date(resource.expiresAt).getTime();
      if (asOfTime >= expTime && !resource.isDeleted) {
        resource.comment = null; // Purge third-party copyright content
        resource.reviewerName = '[PURGED_DUE_TO_RETENTION]';
        resource.isDeleted = true;
        resource.purgedAt = asOfDateIso;
        purgedResources++;
      }
    }

    for (const [id, assessment] of this.assessments.entries()) {
      const expTime = new Date(assessment.expiresAt).getTime();
      if (asOfTime >= expTime) {
        this.assessments.delete(id);
        purgedAssessments++;
      }
    }

    return { purgedResources, purgedAssessments };
  }

  /**
   * Cascade disconnect/deletion for a connected location or provider.
   */
  static purgeLocationReviews(locationId: string): void {
    const nowIso = new Date().toISOString();
    for (const resource of this.reviewResources.values()) {
      if (resource.locationId === locationId) {
        resource.comment = null;
        resource.isDeleted = true;
        resource.purgedAt = nowIso;
      }
    }
    for (const [id, assessment] of this.assessments.entries()) {
      const resource = this.reviewResources.get(assessment.reviewResourceId);
      if (resource?.locationId === locationId) {
        this.assessments.delete(id);
      }
    }
  }

  static getResource(id: string): ReviewResource | undefined {
    return this.reviewResources.get(id);
  }

  static getAssessmentForResource(resourceId: string): EphemeralReviewAssessment | undefined {
    for (const a of this.assessments.values()) {
      if (a.reviewResourceId === resourceId) return a;
    }
    return undefined;
  }

  static getDraft(id: string): OwnerReplyDraft | undefined {
    return this.replyDrafts.get(id);
  }
}
