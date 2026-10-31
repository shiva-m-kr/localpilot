import { randomUUID, createHash } from 'crypto';
import {
  ReviewEscalationCategory,
  ReviewTaskAssignment,
  InternalSupportNote,
  ReplyApprovalBinding,
  ReviewResource,
  GeneratedReplyDraft
} from '@localpilot/contracts';
import { TenantAccessDeniedError, ValidationFailedError } from './errors.js';

export class ReplyEscalationService {
  private static tasks = new Map<string, ReviewTaskAssignment>();
  private static approvalBindings = new Map<string, ReplyApprovalBinding>();

  static reset(): void {
    this.tasks.clear();
    this.approvalBindings.clear();
  }

  static computeDraftHash(text: string): string {
    return createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Assigns an owner/staff task for review escalation (e.g. customer complaint or legal risk).
   */
  static createEscalationTask(params: {
    review: ReviewResource;
    escalationCategory: ReviewEscalationCategory;
    assignedUserId: string;
    deadlineHours?: number;
    initialNote?: string;
  }): ReviewTaskAssignment {
    const taskId = randomUUID();
    const now = new Date();
    const deadlineHours = params.deadlineHours || 24;
    const deadlineAt = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000).toISOString();

    const internalNotes: InternalSupportNote[] = [];
    if (params.initialNote) {
      internalNotes.push({
        noteId: randomUUID(),
        authorUserId: params.assignedUserId,
        text: params.initialNote,
        createdAt: now.toISOString(),
        isPrivateSupportNote: true
      });
    }

    const task: ReviewTaskAssignment = {
      taskId,
      reviewResourceId: params.review.id,
      organizationId: params.review.organizationId,
      locationId: params.review.locationId,
      assignedUserId: params.assignedUserId,
      escalationCategory: params.escalationCategory,
      deadlineAt,
      internalNotes,
      status: 'OPEN',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Adds an internal support note to an existing review escalation task.
   */
  static addInternalSupportNote(params: {
    taskId: string;
    authorUserId: string;
    text: string;
  }): InternalSupportNote {
    const task = this.tasks.get(params.taskId);
    if (!task) throw new ValidationFailedError(`Task ${params.taskId} not found.`);

    const note: InternalSupportNote = {
      noteId: randomUUID(),
      authorUserId: params.authorUserId,
      text: params.text,
      createdAt: new Date().toISOString(),
      isPrivateSupportNote: true
    };

    task.internalNotes.push(note);
    task.updatedAt = new Date().toISOString();
    return note;
  }

  /**
   * Binds an approval to a specific review revision and draft text hash.
   * Gated by user location authorization.
   */
  static approveReplyWithBinding(params: {
    review: ReviewResource;
    draft: GeneratedReplyDraft;
    userId: string;
    userAssignedLocationIds: string[]; // Strict location scope
    forceOverrideExistingReply?: boolean;
  }): ReplyApprovalBinding {
    // 1. Strict location check: prevent replying at unassigned location through forged resource ID
    if (!params.userAssignedLocationIds.includes(params.review.locationId)) {
      throw new TenantAccessDeniedError(
        params.review.organizationId,
        params.review.locationId,
        { reason: `User ${params.userId} is not assigned to location ${params.review.locationId}. Forged resource reply blocked.` }
      );
    }

    // 2. Existing manual provider reply check
    if (params.review.existingReply && !params.forceOverrideExistingReply) {
      throw new ValidationFailedError(
        `Review already has an existing live reply on Google: "${params.review.existingReply.comment}". Requires explicit forceOverrideExistingReply to approve replacement.`
      );
    }

    const boundDraftHash = this.computeDraftHash(params.draft.text);
    const approvalId = randomUUID();

    const binding: ReplyApprovalBinding = {
      approvalId,
      draftId: params.draft.draftId,
      reviewResourceId: params.review.id,
      boundSourceRevision: params.review.sourceRevision,
      boundDraftHash,
      approvedByUserId: params.userId,
      approvedAt: new Date().toISOString(),
      isValid: true,
      invalidationReason: null
    };

    this.approvalBindings.set(approvalId, binding);
    return binding;
  }

  /**
   * Validates whether an approval remains valid against current live review and draft text.
   */
  static validateApprovalBinding(params: {
    approvalId: string;
    currentReview: ReviewResource;
    currentDraftText: string;
  }): { isValid: boolean; invalidationReason: string | null } {
    const binding = this.approvalBindings.get(params.approvalId);
    if (!binding) return { isValid: false, invalidationReason: 'Approval binding not found' };

    // Check if source revision changed
    if (binding.boundSourceRevision !== params.currentReview.sourceRevision) {
      binding.isValid = false;
      binding.invalidationReason = 'Source review text or rating changed since approval (stale source)';
      return { isValid: false, invalidationReason: binding.invalidationReason };
    }

    // Check if draft text was altered
    const currentHash = this.computeDraftHash(params.currentDraftText);
    if (binding.boundDraftHash !== currentHash) {
      binding.isValid = false;
      binding.invalidationReason = 'Draft text was edited since approval (hash mismatch)';
      return { isValid: false, invalidationReason: binding.invalidationReason };
    }

    return { isValid: true, invalidationReason: null };
  }

  /**
   * Generates public reply payload, strictly excluding any private support notes.
   */
  static getPublicReplyPayload(params: {
    draft: GeneratedReplyDraft;
    task?: ReviewTaskAssignment;
  }): { publicComment: string; reviewResourceId: string } {
    // Explicitly guarantee that internalNotes are not contained in returned object
    return {
      publicComment: params.draft.text,
      reviewResourceId: params.draft.reviewResourceId
    };
  }

  static getTask(taskId: string): ReviewTaskAssignment | undefined {
    return this.tasks.get(taskId);
  }

  static getBinding(approvalId: string): ReplyApprovalBinding | undefined {
    return this.approvalBindings.get(approvalId);
  }
}
