import {
  AuditIssue,
  SeoFixProposal,
  FixTargetPlatform,
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface SeoFixStorage {
  getProposalById(id: string): Promise<SeoFixProposal | null>;
  saveProposal(proposal: SeoFixProposal): Promise<void>;
  createSnapshot(siteId: string, pageUrl: string, snapshotData: Record<string, any>): Promise<string>;
  getSnapshot(snapshotId: string): Promise<Record<string, any> | null>;
  getPageMetadata(siteId: string, pageUrl: string): Promise<{ title?: string; metaDescription?: string; canonical?: string } | null>;
  updatePageMetadata(siteId: string, pageUrl: string, updates: { title?: string; metaDescription?: string; canonical?: string }): Promise<void>;
}

export class SeoFixRollbackService {
  private storage: SeoFixStorage;

  constructor(storage: SeoFixStorage) {
    this.storage = storage;
  }

  /**
   * Generates a safe fix proposal from an identified technical audit issue
   */
  public async createProposal(
    issue: AuditIssue,
    siteId: string,
    targetPlatform: FixTargetPlatform = 'HOSTED_LOCALPILOT',
    currentMetadata?: { title?: string; metaDescription?: string; canonical?: string }
  ): Promise<SeoFixProposal> {
    const id = crypto.randomUUID ? crypto.randomUUID() : `prop-${Date.now()}`;
    const now = new Date().toISOString();

    let fieldToUpdate = '';
    let currentValue = '';
    let proposedValue = '';
    let proposalType: any = 'UPDATE_TITLE';
    let explanation = '';
    let manualSteps: string[] | undefined;

    switch (issue.category) {
      case 'CANONICAL':
        proposalType = 'ADD_CANONICAL';
        fieldToUpdate = 'canonical';
        currentValue = currentMetadata?.canonical || '';
        proposedValue = issue.pageUrl;
        explanation = `Add self-referencing canonical tag pointing to ${issue.pageUrl} to prevent duplicate content indexing.`;
        break;

      case 'METADATA':
        if (issue.title.includes('Title')) {
          proposalType = 'UPDATE_TITLE';
          fieldToUpdate = 'title';
          currentValue = currentMetadata?.title || '';
          proposedValue = (currentMetadata?.title || '').slice(0, 55).trim();
          explanation = 'Shorten meta title to under 60 characters to prevent truncation in search result snippets.';
        } else {
          proposalType = 'ADD_META_DESCRIPTION';
          fieldToUpdate = 'metaDescription';
          currentValue = currentMetadata?.metaDescription || '';
          proposedValue = 'Professional local business services with verified licensed experts. Contact us today for rapid dispatch.';
          explanation = 'Add informative meta description between 70-155 characters to enhance click-through rates.';
        }
        break;

      case 'INDEXABILITY':
        proposalType = 'REMOVE_NOINDEX';
        fieldToUpdate = 'noindex';
        currentValue = 'noindex, nofollow';
        proposedValue = 'index, follow';
        explanation = 'Remove restrictive noindex directive to allow search engines to crawl and index this page.';
        break;

      default:
        proposalType = 'UPDATE_TITLE';
        fieldToUpdate = 'general';
        currentValue = '';
        proposedValue = '';
        explanation = issue.recommendation;
    }

    if (targetPlatform === 'EXTERNAL_WORDPRESS') {
      manualSteps = [
        `1. Log in to your WordPress Admin dashboard.`,
        `2. Navigate to Pages / Posts and edit the page at '${issue.pageUrl}'.`,
        `3. In your SEO plugin (e.g. Yoast / RankMath), update the '${fieldToUpdate}' field.`,
        `4. Set new value to: '${proposedValue}'.`,
        `5. Click 'Update' and purge site cache.`,
      ];
    }

    const proposal: SeoFixProposal = {
      id,
      issueId: issue.id,
      siteId,
      category: issue.category,
      proposalType,
      targetPlatform,
      pageUrl: issue.pageUrl,
      fieldToUpdate,
      currentValue,
      proposedValue,
      explanation,
      status: targetPlatform === 'EXTERNAL_WORDPRESS' ? 'MANUAL_INSTRUCTIONS_PROVIDED' : 'PENDING_REVIEW',
      manualSteps,
      readbackVerified: false,
      createdAt: now,
    };

    await this.storage.saveProposal(proposal);
    return proposal;
  }

  /**
   * Applies an approved fix with mandatory snapshotting and readback verification
   */
  public async applyFixWithSnapshot(
    proposalId: string,
    siteId: string,
    userId: string,
    consentAcknowledged: boolean
  ): Promise<SeoFixProposal> {
    if (!consentAcknowledged) {
      throw new ValidationFailedError('Owner consent is required before applying automated site modifications.');
    }

    const proposal = await this.storage.getProposalById(proposalId);
    if (!proposal) {
      throw new ValidationFailedError(`Proposal '${proposalId}' not found.`);
    }

    if (proposal.siteId !== siteId) {
      throw new ValidationFailedError('Tenant site scope mismatch.');
    }

    if (proposal.targetPlatform === 'EXTERNAL_WORDPRESS') {
      throw new ValidationFailedError(
        'Automated apply is not permitted on external WordPress sites without an authorized companion plugin. Use manual instructions.'
      );
    }

    // 1. Take snapshot of current state
    const currentMeta = await this.storage.getPageMetadata(siteId, proposal.pageUrl);
    const snapshotId = await this.storage.createSnapshot(siteId, proposal.pageUrl, currentMeta || {});
    proposal.snapshotId = snapshotId;

    // 2. Apply proposed update
    const updatePayload: Record<string, string> = {};
    if (proposal.fieldToUpdate === 'title') updatePayload.title = proposal.proposedValue;
    if (proposal.fieldToUpdate === 'metaDescription') updatePayload.metaDescription = proposal.proposedValue;
    if (proposal.fieldToUpdate === 'canonical') updatePayload.canonical = proposal.proposedValue;

    await this.storage.updatePageMetadata(siteId, proposal.pageUrl, updatePayload);

    // 3. Readback Verification: Re-read state to confirm update actually took effect
    const readbackMeta = await this.storage.getPageMetadata(siteId, proposal.pageUrl);
    let verified = false;

    if (proposal.fieldToUpdate === 'title' && readbackMeta?.title === proposal.proposedValue) {
      verified = true;
    } else if (proposal.fieldToUpdate === 'metaDescription' && readbackMeta?.metaDescription === proposal.proposedValue) {
      verified = true;
    } else if (proposal.fieldToUpdate === 'canonical' && readbackMeta?.canonical === proposal.proposedValue) {
      verified = true;
    }

    const now = new Date().toISOString();
    if (verified) {
      proposal.status = 'APPLIED';
      proposal.readbackVerified = true;
      proposal.appliedAt = now;
    } else {
      // Readback failed: rollback immediately!
      await this.storage.updatePageMetadata(siteId, proposal.pageUrl, currentMeta || {});
      proposal.status = 'FAILED_VERIFICATION';
      proposal.readbackVerified = false;
      proposal.rolledBackAt = now;
    }

    await this.storage.saveProposal(proposal);
    return proposal;
  }

  /**
   * Reverses an applied fix, restoring the pre-fix snapshot
   */
  public async rollbackFix(
    proposalId: string,
    siteId: string,
    userId: string
  ): Promise<SeoFixProposal> {
    const proposal = await this.storage.getProposalById(proposalId);
    if (!proposal) {
      throw new ValidationFailedError(`Proposal '${proposalId}' not found.`);
    }

    if (proposal.status !== 'APPLIED' && proposal.status !== 'FAILED_VERIFICATION') {
      throw new ValidationFailedError(`Cannot rollback proposal with status '${proposal.status}'.`);
    }

    if (!proposal.snapshotId) {
      throw new ValidationFailedError('No pre-fix snapshot found for this proposal.');
    }

    const snapshotData = await this.storage.getSnapshot(proposal.snapshotId);
    if (!snapshotData) {
      throw new ValidationFailedError(`Snapshot '${proposal.snapshotId}' data not found.`);
    }

    // Restore snapshot
    await this.storage.updatePageMetadata(siteId, proposal.pageUrl, snapshotData);

    const now = new Date().toISOString();
    proposal.status = 'ROLLED_BACK';
    proposal.rolledBackAt = now;
    proposal.readbackVerified = false;

    await this.storage.saveProposal(proposal);
    return proposal;
  }
}
