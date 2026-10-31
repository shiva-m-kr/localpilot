import {
  PresenceConflictRecord,
  StaleDraftInvalidationResult,
  PresenceField,
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface PresenceStorage {
  getConflictsForLocation(locationId: string): Promise<PresenceConflictRecord[]>;
  saveConflict(conflict: PresenceConflictRecord): Promise<void>;
  resolveConflict(conflictId: string): Promise<void>;
  getScheduledDraftsForLocation(locationId: string): Promise<Array<{ id: string; contentBody: string; isInvalidated: boolean }>>;
  invalidateDraft(draftId: string, reason: string): Promise<void>;
  purgeExpiredCacheRecords(olderThanIso: string): Promise<number>;
}

export class PresenceFreshnessService {
  private storage: PresenceStorage;

  constructor(storage: PresenceStorage) {
    this.storage = storage;
  }

  /**
   * Evaluates external changes from Google or directories and creates owner review tasks.
   * CRITICAL RULE: Never automatically revert Google or directory changes; queue owner-confirmed tasks!
   */
  public async handleObservedExternalChange(params: {
    locationId: string;
    sourceProvider: string;
    field: PresenceField;
    confirmedLocalValue: string;
    observedExternalValue: string;
  }): Promise<PresenceConflictRecord> {
    const existingConflicts = await this.storage.getConflictsForLocation(params.locationId);
    const duplicate = existingConflicts.find(
      (c) =>
        !c.isResolved &&
        c.sourceProvider === params.sourceProvider &&
        c.field === params.field &&
        c.observedExternalValue === params.observedExternalValue
    );

    if (duplicate) {
      return duplicate; // Duplicate suppression
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : `conf-${Date.now()}`;
    const now = new Date().toISOString();

    const conflict: PresenceConflictRecord = {
      id,
      locationId: params.locationId as any,
      conflictType: 'EXTERNAL_PROVIDER_CHANGE',
      field: params.field,
      sourceProvider: params.sourceProvider,
      confirmedLocalValue: params.confirmedLocalValue,
      observedExternalValue: params.observedExternalValue,
      suggestedAction: 'QUEUE_OWNER_CORRECTION_TASK',
      actionExplanation: `External change detected on ${params.sourceProvider} for ${params.field}. Awaiting owner review to confirm whether to accept change or publish correction.`,
      isResolved: false,
      detectedAt: now,
    };

    await this.storage.saveConflict(conflict);
    return conflict;
  }

  /**
   * When confirmed business facts change (e.g. phone or hours), invalidates scheduled dependent drafts
   */
  public async handleFactChangeInvalidation(
    locationId: string,
    changedField: PresenceField,
    oldValue: string,
    newValue: string
  ): Promise<StaleDraftInvalidationResult> {
    const scheduledDrafts = await this.storage.getScheduledDraftsForLocation(locationId);
    const affectedDraftIds: string[] = [];

    const reason = `Business ${changedField} was updated from '${oldValue}' to '${newValue}'. Dependent scheduled draft contains superseded facts and must be re-approved.`;

    for (const draft of scheduledDrafts) {
      if (!draft.isInvalidated) {
        // If draft mentions old value (e.g. old phone number)
        if (draft.contentBody.includes(oldValue)) {
          await this.storage.invalidateDraft(draft.id, reason);
          affectedDraftIds.push(draft.id);
        }
      }
    }

    return {
      locationId: locationId as any,
      affectedDraftsCount: affectedDraftIds.length,
      invalidatedDraftIds: affectedDraftIds,
      invalidationReason: reason,
    };
  }

  /**
   * Stale Offer Protection: Verifies promotion is within active date window
   */
  public isOfferActive(offer: { startDateIso: string; endDateIso: string }): boolean {
    const now = Date.now();
    const start = new Date(offer.startDateIso).getTime();
    const end = new Date(offer.endDateIso).getTime();

    if (isNaN(start) || isNaN(end)) {
      return false;
    }

    // Must be within active window
    return now >= start && now <= end;
  }

  /**
   * Enforces provider storage limits & purges TTL expired cache entries
   */
  public async cleanupExpiredProviderData(retentionTtlDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionTtlDays * 24 * 60 * 60 * 1000).toISOString();
    return this.storage.purgeExpiredCacheRecords(cutoffDate);
  }
}
