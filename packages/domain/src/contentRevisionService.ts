import { createHash, randomUUID } from 'crypto';
import {
  DraftRevision,
  ApprovalBinding,
  RevisionDiff,
  BlockDiffItem,
  ContentBlock,
  RevisionChangeType
} from '@localpilot/contracts';
import { StaleRevisionError, ValidationFailedError } from './errors.js';

export interface DraftState {
  draftId: string;
  organizationId: string;
  locationId: string;
  currentRevisionNumber: number;
  latestRevision: DraftRevision;
  history: DraftRevision[];
  activeApproval: ApprovalBinding | null;
  factsVersion: number;
}

export class ContentRevisionService {
  /**
   * Computes deterministic SHA-256 hash of title, meta, and block contents.
   */
  static computePayloadHash(title: string, metaDescription: string, blocks: ContentBlock[]): string {
    const payloadStr = JSON.stringify({
      title,
      metaDescription,
      blocks: blocks.map((b) => ({ id: b.id, type: b.type, content: b.content }))
    });
    return createHash('sha256').update(payloadStr).digest('hex');
  }

  /**
   * Initializes a new draft with revision 1.
   */
  static createInitialDraft(params: {
    organizationId: string;
    locationId: string;
    title: string;
    metaDescription: string;
    blocks: ContentBlock[];
    authorUserId: string;
    factsVersion: number;
  }): DraftState {
    const draftId = randomUUID();
    const revisionId = randomUUID();
    const now = new Date().toISOString();
    const payloadHash = this.computePayloadHash(params.title, params.metaDescription, params.blocks);

    const initialRevision: DraftRevision = {
      revisionId,
      draftId,
      revisionNumber: 1,
      changeType: 'INITIAL_DRAFT',
      changeSummary: 'Initial draft generation',
      title: params.title,
      metaDescription: params.metaDescription,
      blocks: params.blocks,
      factsVersion: params.factsVersion,
      authorUserId: params.authorUserId,
      payloadHash,
      createdAt: now
    };

    return {
      draftId,
      organizationId: params.organizationId,
      locationId: params.locationId,
      currentRevisionNumber: 1,
      latestRevision: initialRevision,
      history: [initialRevision],
      activeApproval: null,
      factsVersion: params.factsVersion
    };
  }

  /**
   * Saves a new revision with strict optimistic concurrency check.
   * Modifying approved content automatically voids the existing approval.
   */
  static saveRevision(
    state: DraftState,
    command: {
      baseRevisionNumber: number;
      title: string;
      metaDescription: string;
      blocks: ContentBlock[];
      changeType: RevisionChangeType;
      changeSummary: string;
      authorUserId: string;
      factsVersion?: number;
    }
  ): DraftState {
    // 1. Optimistic Concurrency Control
    if (command.baseRevisionNumber !== state.currentRevisionNumber) {
      throw new StaleRevisionError(
        command.baseRevisionNumber,
        state.currentRevisionNumber,
        { reason: 'Base revision is outdated. Please refresh before editing.' }
      );
    }

    const nextRevisionNumber = state.currentRevisionNumber + 1;
    const revisionId = randomUUID();
    const now = new Date().toISOString();
    const payloadHash = this.computePayloadHash(command.title, command.metaDescription, command.blocks);
    const factsVersion = command.factsVersion ?? state.factsVersion;

    const newRevision: DraftRevision = {
      revisionId,
      draftId: state.draftId,
      revisionNumber: nextRevisionNumber,
      changeType: command.changeType,
      changeSummary: command.changeSummary,
      title: command.title,
      metaDescription: command.metaDescription,
      blocks: command.blocks,
      factsVersion,
      authorUserId: command.authorUserId,
      payloadHash,
      createdAt: now
    };

    // Any modification to previously approved content invalidates the approval
    return {
      ...state,
      currentRevisionNumber: nextRevisionNumber,
      latestRevision: newRevision,
      history: [...state.history, newRevision],
      activeApproval: null, // VOID APPROVAL ON MODIFICATION
      factsVersion
    };
  }

  /**
   * Applies an AI selection rewrite to a specific block, creating a new reviewable revision.
   */
  static applyAiSelectionRewrite(
    state: DraftState,
    command: {
      baseRevisionNumber: number;
      targetBlockId: string;
      rewrittenContent: string;
      authorUserId: string;
      aiInstruction: string;
    }
  ): DraftState {
    const targetIndex = state.latestRevision.blocks.findIndex((b) => b.id === command.targetBlockId);
    if (targetIndex === -1) {
      throw new ValidationFailedError(`Target block ${command.targetBlockId} not found in draft.`);
    }

    const updatedBlocks = [...state.latestRevision.blocks];
    updatedBlocks[targetIndex] = {
      ...updatedBlocks[targetIndex],
      content: command.rewrittenContent
    };

    return this.saveRevision(state, {
      baseRevisionNumber: command.baseRevisionNumber,
      title: state.latestRevision.title,
      metaDescription: state.latestRevision.metaDescription,
      blocks: updatedBlocks,
      changeType: 'AI_SELECTION_REWRITE',
      changeSummary: `AI Rewrite: "${command.aiInstruction}"`,
      authorUserId: command.authorUserId
    });
  }

  /**
   * Binds explicit owner approval to a specific revision and facts version.
   */
  static approveRevision(
    state: DraftState,
    revisionNumber: number,
    approvedByUserId: string,
    currentFactsVersion: number
  ): DraftState {
    const revision = state.history.find((r) => r.revisionNumber === revisionNumber);
    if (!revision) {
      throw new ValidationFailedError(`Revision ${revisionNumber} does not exist.`);
    }

    // Verify facts have not changed since revision was drafted
    if (currentFactsVersion !== revision.factsVersion) {
      throw new StaleRevisionError(revision.factsVersion, currentFactsVersion, {
        reason: 'Business facts were updated after this revision was drafted. Re-validation required.'
      });
    }

    const binding: ApprovalBinding = {
      approvalId: randomUUID(),
      draftId: state.draftId,
      revisionNumber,
      payloadHash: revision.payloadHash,
      factsVersion: revision.factsVersion,
      approvedByUserId,
      approvedAt: new Date().toISOString()
    };

    return {
      ...state,
      activeApproval: binding
    };
  }

  /**
   * Computes before/after diff between two revisions.
   */
  static computeDiff(state: DraftState, fromRevisionNumber: number, toRevisionNumber: number): RevisionDiff {
    const fromRev = state.history.find((r) => r.revisionNumber === fromRevisionNumber);
    const toRev = state.history.find((r) => r.revisionNumber === toRevisionNumber);

    if (!fromRev || !toRev) {
      throw new ValidationFailedError('One or both revisions not found.');
    }

    const blockDiffs: BlockDiffItem[] = [];
    const oldBlockMap = new Map(fromRev.blocks.map((b) => [b.id, b]));
    const newBlockMap = new Map(toRev.blocks.map((b) => [b.id, b]));

    for (const [id, newBlock] of newBlockMap.entries()) {
      const oldBlock = oldBlockMap.get(id);
      if (!oldBlock) {
        blockDiffs.push({
          blockId: id,
          status: 'ADDED',
          newContent: newBlock.content
        });
      } else if (oldBlock.content !== newBlock.content) {
        blockDiffs.push({
          blockId: id,
          status: 'MODIFIED',
          oldContent: oldBlock.content,
          newContent: newBlock.content
        });
      } else {
        blockDiffs.push({
          blockId: id,
          status: 'UNCHANGED',
          oldContent: oldBlock.content,
          newContent: newBlock.content
        });
      }
    }

    for (const [id, oldBlock] of oldBlockMap.entries()) {
      if (!newBlockMap.has(id)) {
        blockDiffs.push({
          blockId: id,
          status: 'REMOVED',
          oldContent: oldBlock.content
        });
      }
    }

    return {
      fromRevisionNumber,
      toRevisionNumber,
      titleChanged: fromRev.title !== toRev.title,
      metaDescriptionChanged: fromRev.metaDescription !== toRev.metaDescription,
      blockDiffs
    };
  }

  /**
   * Restores an older revision as the latest revision with new revision number.
   */
  static restoreRevision(
    state: DraftState,
    targetRevisionNumber: number,
    authorUserId: string
  ): DraftState {
    const targetRev = state.history.find((r) => r.revisionNumber === targetRevisionNumber);
    if (!targetRev) {
      throw new ValidationFailedError(`Cannot restore revision ${targetRevisionNumber}: does not exist.`);
    }

    return this.saveRevision(state, {
      baseRevisionNumber: state.currentRevisionNumber,
      title: targetRev.title,
      metaDescription: targetRev.metaDescription,
      blocks: targetRev.blocks,
      changeType: 'RESTORE_PREVIOUS_REVISION',
      changeSummary: `Restored content from Revision ${targetRevisionNumber}`,
      authorUserId
    });
  }
}
