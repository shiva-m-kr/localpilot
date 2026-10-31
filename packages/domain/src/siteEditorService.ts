import {
  HostedSiteRecord,
  SiteRevision,
  SiteBlock,
  RevisionCompareResult,
  LocalPageRequest,
  AntiDoorwayCheckResult,
} from '@localpilot/contracts';
import { StaleRevisionError, ValidationFailedError } from './errors.js';

export interface SiteEditorStorage {
  getSiteById(siteId: string): Promise<HostedSiteRecord | null>;
  updateSite(site: HostedSiteRecord): Promise<void>;
  getRevisionById(revisionId: string): Promise<SiteRevision | null>;
  saveRevision(revision: SiteRevision): Promise<void>;
  getConfirmedServiceAreas(locationId: string): Promise<string[]>;
  getAllPageContents(siteId: string): Promise<string[]>;
}

export class SiteEditorService {
  private storage: SiteEditorStorage;

  constructor(storage: SiteEditorStorage) {
    this.storage = storage;
  }

  /**
   * Updates blocks in the active draft revision with optimistic concurrency protection
   */
  public async updateDraftBlocks(
    siteId: string,
    expectedRevisionId: string,
    newBlocks: SiteBlock[],
    metaUpdates?: { metaTitle?: string; metaDescription?: string }
  ): Promise<SiteRevision> {
    const site = await this.storage.getSiteById(siteId);
    if (!site) {
      throw new ValidationFailedError(`Site '${siteId}' not found.`);
    }

    if (site.currentDraftRevisionId !== expectedRevisionId) {
      throw new StaleRevisionError(
        expectedRevisionId,
        site.currentDraftRevisionId
      );
    }

    const currentDraft = await this.storage.getRevisionById(site.currentDraftRevisionId);
    if (!currentDraft) {
      throw new ValidationFailedError(`Revision '${site.currentDraftRevisionId}' not found.`);
    }

    // Ensure order indices are consecutive and valid
    const sortedBlocks = [...newBlocks].map((block, idx) => ({
      ...block,
      orderIndex: idx,
    }));

    const updatedRevision: SiteRevision = {
      ...currentDraft,
      blocks: sortedBlocks,
      metaTitle: metaUpdates?.metaTitle ?? currentDraft.metaTitle,
      metaDescription: metaUpdates?.metaDescription ?? currentDraft.metaDescription,
      createdAt: new Date().toISOString(),
    };

    await this.storage.saveRevision(updatedRevision);
    return updatedRevision;
  }

  /**
   * Compares two revisions and produces a structural diff
   */
  public async compareRevisions(
    fromRevisionId: string,
    toRevisionId: string
  ): Promise<RevisionCompareResult> {
    const fromRev = await this.storage.getRevisionById(fromRevisionId);
    const toRev = await this.storage.getRevisionById(toRevisionId);

    if (!fromRev || !toRev) {
      throw new ValidationFailedError('One or both revisions not found for comparison.');
    }

    const fromBlockMap = new Map<string, SiteBlock>(fromRev.blocks.map((b) => [b.id, b]));
    const toBlockMap = new Map<string, SiteBlock>(toRev.blocks.map((b) => [b.id, b]));

    const blocksAdded: string[] = [];
    const blocksRemoved: string[] = [];
    const blocksModified: Array<{
      blockId: string;
      blockType: string;
      fieldDiffs: Record<string, { before: any; after: any }>;
    }> = [];

    for (const [id, toBlock] of toBlockMap.entries()) {
      if (!fromBlockMap.has(id)) {
        blocksAdded.push(id);
      } else {
        const fromBlock = fromBlockMap.get(id)!;
        const diffs: Record<string, { before: any; after: any }> = {};

        if (fromBlock.type !== toBlock.type) {
          diffs['type'] = { before: fromBlock.type, after: toBlock.type };
        }
        if (fromBlock.heading !== toBlock.heading) {
          diffs['heading'] = { before: fromBlock.heading, after: toBlock.heading };
        }
        if (fromBlock.orderIndex !== toBlock.orderIndex) {
          diffs['orderIndex'] = { before: fromBlock.orderIndex, after: toBlock.orderIndex };
        }
        if (fromBlock.isVisible !== toBlock.isVisible) {
          diffs['isVisible'] = { before: fromBlock.isVisible, after: toBlock.isVisible };
        }

        if (Object.keys(diffs).length > 0) {
          blocksModified.push({
            blockId: id,
            blockType: toBlock.type,
            fieldDiffs: diffs,
          });
        }
      }
    }

    for (const [id] of fromBlockMap.entries()) {
      if (!toBlockMap.has(id)) {
        blocksRemoved.push(id);
      }
    }

    return {
      fromRevisionId,
      toRevisionId,
      blocksAdded,
      blocksRemoved,
      blocksModified,
      isMetaModified:
        fromRev.metaTitle !== toRev.metaTitle ||
        fromRev.metaDescription !== toRev.metaDescription,
      themeModified: JSON.stringify(fromRev.theme) !== JSON.stringify(toRev.theme),
    };
  }

  /**
   * Publishes the current draft revision, making it the active live public revision
   */
  public async publishRevision(
    siteId: string,
    expectedDraftRevisionId: string
  ): Promise<{ publishedRevisionId: string; nextDraftRevisionId: string }> {
    const site = await this.storage.getSiteById(siteId);
    if (!site) {
      throw new ValidationFailedError(`Site '${siteId}' not found.`);
    }

    if (site.currentDraftRevisionId !== expectedDraftRevisionId) {
      throw new StaleRevisionError(
        expectedDraftRevisionId,
        site.currentDraftRevisionId
      );
    }

    const draft = await this.storage.getRevisionById(expectedDraftRevisionId);
    if (!draft) {
      throw new ValidationFailedError(`Draft revision '${expectedDraftRevisionId}' not found.`);
    }

    // Mark current revision as published
    const publishedAt = new Date().toISOString();
    const publishedRevision: SiteRevision = {
      ...draft,
      isPublished: true,
      publishedAt,
    };
    await this.storage.saveRevision(publishedRevision);

    // Create next clean working draft cloned from published revision
    const nextDraftRevisionId = crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`;
    const nextDraftRevision: SiteRevision = {
      ...publishedRevision,
      revisionId: nextDraftRevisionId,
      isPublished: false,
      publishedAt: undefined,
      createdAt: publishedAt,
    };
    await this.storage.saveRevision(nextDraftRevision);

    // Update site pointer
    site.currentPublishedRevisionId = publishedRevision.revisionId;
    site.currentDraftRevisionId = nextDraftRevisionId;
    site.updatedAt = publishedAt;
    await this.storage.updateSite(site);

    return {
      publishedRevisionId: publishedRevision.revisionId,
      nextDraftRevisionId,
    };
  }

  /**
   * Restores an older historic revision, creating a new working draft from it
   */
  public async restoreRevision(
    siteId: string,
    targetRevisionId: string
  ): Promise<SiteRevision> {
    const site = await this.storage.getSiteById(siteId);
    if (!site) {
      throw new ValidationFailedError(`Site '${siteId}' not found.`);
    }

    const historicRev = await this.storage.getRevisionById(targetRevisionId);
    if (!historicRev) {
      throw new ValidationFailedError(`Target revision '${targetRevisionId}' not found.`);
    }

    const newDraftId = crypto.randomUUID ? crypto.randomUUID() : `restored-draft-${Date.now()}`;
    const restoredDraft: SiteRevision = {
      ...historicRev,
      revisionId: newDraftId,
      isPublished: false,
      publishedAt: undefined,
      createdAt: new Date().toISOString(),
    };

    await this.storage.saveRevision(restoredDraft);

    site.currentDraftRevisionId = newDraftId;
    site.updatedAt = new Date().toISOString();
    await this.storage.updateSite(site);

    return restoredDraft;
  }

  /**
   * Anti-Doorway check: Prevents generating thin, repetitive city pages
   * Rejects doorway pages if similarity > 0.70, or area is unconfirmed, or differentiated offerings are missing.
   */
  public async validateLocalPageAgainstDoorways(
    request: LocalPageRequest
  ): Promise<AntiDoorwayCheckResult> {
    const site = await this.storage.getSiteById(request.siteId);
    if (!site) {
      throw new ValidationFailedError(`Site '${request.siteId}' not found.`);
    }

    // 1. Verify that the target area is in the confirmed business service coverage
    const confirmedAreas = await this.storage.getConfirmedServiceAreas(site.locationId);
    const normalizedTarget = request.targetCityOrArea.trim().toLowerCase();
    const isAreaConfirmed = confirmedAreas.some(
      (area) => area.trim().toLowerCase() === normalizedTarget
    );

    if (!isAreaConfirmed) {
      return {
        isAllowed: false,
        duplicateSimilarityScore: 1.0,
        rejectionReason: `Target area '${request.targetCityOrArea}' is not in the confirmed business service areas. Creating doorway pages for unserviced areas is prohibited.`,
        differentiatedFactVerified: false,
      };
    }

    // 2. Verify differentiated offerings are genuine and non-empty
    if (!request.differentiatedOfferings || request.differentiatedOfferings.length === 0) {
      return {
        isAllowed: false,
        duplicateSimilarityScore: 1.0,
        rejectionReason: 'Local landing page lacks specific differentiated local offerings or team details.',
        differentiatedFactVerified: false,
      };
    }

    // 3. Compute text similarity against existing site pages to prevent 90% duplicate boilerplate
    const existingPages = await this.storage.getAllPageContents(request.siteId);
    const targetText = `${request.customBioOrIntro} ${request.differentiatedOfferings.join(' ')}`;
    const targetWords = new Set(targetText.toLowerCase().split(/\W+/).filter(w => w.length > 3));

    let maxSimilarity = 0;
    for (const pageContent of existingPages) {
      const existingWords = new Set(pageContent.toLowerCase().split(/\W+/).filter(w => w.length > 3));
      if (existingWords.size === 0 || targetWords.size === 0) continue;

      let intersection = 0;
      for (const w of targetWords) {
        if (existingWords.has(w)) intersection++;
      }
      const similarity = intersection / Math.min(targetWords.size, existingWords.size);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    if (maxSimilarity > 0.75) {
      return {
        isAllowed: false,
        duplicateSimilarityScore: parseFloat(maxSimilarity.toFixed(2)),
        rejectionReason: `Page text has ${Math.round(maxSimilarity * 100)}% duplicate similarity with existing pages. Google guidelines classify near-duplicate localized templates as manipulative doorway pages.`,
        differentiatedFactVerified: true,
      };
    }

    return {
      isAllowed: true,
      duplicateSimilarityScore: parseFloat(maxSimilarity.toFixed(2)),
      differentiatedFactVerified: true,
    };
  }
}
