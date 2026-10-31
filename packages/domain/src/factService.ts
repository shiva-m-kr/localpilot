import crypto from 'crypto';
import {
  ConfirmedFact,
  FactConflictRecord,
  FactConflictType,
  FactCategory,
  DownstreamDraftWarning
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class FactService {
  // In-memory store for tenant facts
  private static confirmedFacts = new Map<string, ConfirmedFact>();
  private static conflicts = new Map<string, FactConflictRecord>();
  // Active facts version by organization/location
  private static factsVersions = new Map<string, number>();

  /**
   * Normalizes a phone or text string to compare formatting vs actual disagreement.
   */
  static classifyConflict(category: FactCategory, confirmedVal: string, importedVal: string): FactConflictType {
    if (category === 'NAP_PHONE') {
      // Normalize phone: strip spaces, dashes, parentheses, leading zeroes
      const norm1 = confirmedVal.replace(/[^0-9+]/g, '');
      const norm2 = importedVal.replace(/[^0-9+]/g, '');
      if (norm1 === norm2) return 'HARMLESS_FORMATTING';
      return 'ACTUAL_DISAGREEMENT';
    }

    if (category === 'NAP_ADDRESS') {
      // Normalize common street abbreviations: Rd -> Road, St -> Street, Ave -> Avenue
      const norm1 = confirmedVal.toLowerCase().replace(/\brd\b/g, 'road').replace(/\bst\b/g, 'street').replace(/[,.\s]+/g, ' ').trim();
      const norm2 = importedVal.toLowerCase().replace(/\brd\b/g, 'road').replace(/\bst\b/g, 'street').replace(/[,.\s]+/g, ' ').trim();
      if (norm1 === norm2) return 'HARMLESS_FORMATTING';
      return 'ACTUAL_DISAGREEMENT';
    }

    if (confirmedVal.trim().toLowerCase() === importedVal.trim().toLowerCase()) {
      return 'HARMLESS_FORMATTING';
    }

    return 'ACTUAL_DISAGREEMENT';
  }

  /**
   * Evaluates an imported fact against current confirmed facts.
   * Conflicting imports NEVER overwrite confirmed values automatically.
   */
  static ingestImportedFact(
    organizationId: string,
    locationId: string | undefined,
    category: FactCategory,
    key: string,
    importedValue: string,
    sourceUrl: string
  ): { hasConflict: boolean; conflictRecord?: FactConflictRecord } {
    const factKey = `${organizationId}:${locationId || 'global'}:${key}`;
    const existing = this.confirmedFacts.get(factKey);

    if (!existing) {
      // No existing fact; does not overwrite anything
      return { hasConflict: false };
    }

    const conflictType = this.classifyConflict(category, existing.value, importedValue);

    if (conflictType === 'ACTUAL_DISAGREEMENT') {
      const conflictRecord: FactConflictRecord = {
        conflictId: crypto.randomUUID(),
        category,
        key,
        currentConfirmedValue: existing.value,
        importedValue,
        conflictType: 'ACTUAL_DISAGREEMENT',
        sourceUrl,
        observedAt: new Date().toISOString(),
        status: 'UNRESOLVED'
      };
      this.conflicts.set(conflictRecord.conflictId, conflictRecord);
      return { hasConflict: true, conflictRecord };
    }

    return { hasConflict: false };
  }

  /**
   * Confirms a new fact or updates an existing confirmed fact.
   * Increments factsVersion and identifies downstream scheduled drafts that become stale.
   */
  static confirmFact(
    organizationId: string,
    locationId: string | undefined,
    category: FactCategory,
    key: string,
    value: string,
    userId: string,
    scheduledDraftsToCheck: Array<{ id: string; title: string; channel: string; approvedAtFactsVersion: number }> = []
  ): {
    confirmedFact: ConfirmedFact;
    newFactsVersion: number;
    flaggedDrafts: DownstreamDraftWarning[];
  } {
    const versionKey = `${organizationId}:${locationId || 'global'}`;
    const currentVersion = (this.factsVersions.get(versionKey) || 1) + 1;
    this.factsVersions.set(versionKey, currentVersion);

    const factKey = `${organizationId}:${locationId || 'global'}:${key}`;
    const confirmedFact: ConfirmedFact = {
      id: crypto.randomUUID(),
      organizationId,
      locationId,
      category,
      key,
      value,
      version: currentVersion,
      confirmedByUserId: userId,
      confirmedAt: new Date().toISOString()
    };

    this.confirmedFacts.set(factKey, confirmedFact);

    // Identify downstream drafts that were approved using an older facts version
    const flaggedDrafts: DownstreamDraftWarning[] = [];
    for (const draft of scheduledDraftsToCheck) {
      if (draft.approvedAtFactsVersion < currentVersion) {
        flaggedDrafts.push({
          draftId: draft.id,
          draftTitle: draft.title,
          channel: draft.channel,
          approvedAtFactsVersion: draft.approvedAtFactsVersion,
          currentFactsVersion: currentVersion,
          staleFactKey: key,
          requiresReapproval: true
        });
      }
    }

    return {
      confirmedFact,
      newFactsVersion: currentVersion,
      flaggedDrafts
    };
  }

  /**
   * Resolves a conflict by either retaining the confirmed value or explicitly accepting the imported value.
   */
  static resolveConflict(
    conflictId: string,
    resolution: 'RETAIN_CONFIRMED' | 'ACCEPT_IMPORTED',
    userId: string
  ): FactConflictRecord {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new ValidationFailedError(`Conflict record ${conflictId} not found.`);
    }

    conflict.status = resolution;
    return conflict;
  }
}
