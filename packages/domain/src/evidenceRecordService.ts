import { createHash, randomUUID } from 'crypto';
import {
  EvidenceRecord,
  EvidenceSourceClass,
  EvidencePermittedPurpose,
  EvidenceRecordStatus
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class EvidenceRecordService {
  private static records = new Map<string, EvidenceRecord>();

  private static readonly RETENTION_DAYS: Record<EvidenceSourceClass, number | null> = {
    OWNER_CONFIRMED_FACT: null, // No auto-expiry
    GSC_SEARCH_ANALYTICS: 90,
    SERP_OBSERVATION: 30,
    GBP_ACCOUNT_SYNC: 30,
    PUBLIC_WEB_CRAWL: 14
  };

  static reset(): void {
    this.records.clear();
  }

  /**
   * Records a verifiable evidence item with cryptographic integrity reference and strict TTL.
   */
  static recordEvidence(params: {
    organizationId: string;
    locationId: string;
    sourceClass: EvidenceSourceClass;
    permittedPurpose: EvidencePermittedPurpose;
    rawPayload: Record<string, unknown> | string;
    confidenceScore: number;
    capturedAt?: string;
  }): EvidenceRecord {
    const id = randomUUID();
    const payloadStr = typeof params.rawPayload === 'string' ? params.rawPayload : JSON.stringify(params.rawPayload);
    const integrityHash = createHash('sha256').update(payloadStr).digest('hex');

    const capturedDate = params.capturedAt ? new Date(params.capturedAt) : new Date();
    const retentionDays = this.RETENTION_DAYS[params.sourceClass];

    let expiresAt: string | null = null;
    if (retentionDays !== null) {
      const expDate = new Date(capturedDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const record: EvidenceRecord = {
      id,
      organizationId: params.organizationId,
      locationId: params.locationId,
      sourceClass: params.sourceClass,
      permittedPurpose: params.permittedPurpose,
      integrityHash,
      confidenceScore: params.confidenceScore,
      payloadJson: payloadStr,
      isPurged: false,
      capturedAt: capturedDate.toISOString(),
      expiresAt,
      status: 'ACTIVE'
    };

    this.records.set(id, record);
    return record;
  }

  /**
   * Enforces data retention and minimization by purging raw payloads of expired evidence records.
   */
  static purgeExpiredRecords(asOfDateIso = new Date().toISOString()): { purgedCount: number; purgedIds: string[] } {
    const asOfTime = new Date(asOfDateIso).getTime();
    const purgedIds: string[] = [];

    for (const [id, record] of this.records.entries()) {
      if (record.status === 'ACTIVE' && record.expiresAt) {
        const expTime = new Date(record.expiresAt).getTime();
        if (expTime <= asOfTime) {
          const updated: EvidenceRecord = {
            ...record,
            payloadJson: null, // Purge raw payload!
            isPurged: true,
            status: 'PURGED'
          };
          this.records.set(id, updated);
          purgedIds.push(id);
        }
      }
    }

    return { purgedCount: purgedIds.length, purgedIds };
  }

  /**
   * Validates whether an evidence reference is still fresh and legally active.
   * If expired or purged, flags proposal as STALE rather than inventing facts.
   */
  static validateEvidenceActive(
    evidenceId: string,
    asOfDateIso = new Date().toISOString()
  ): { isValid: boolean; record?: EvidenceRecord; reason?: string } {
    const record = this.records.get(evidenceId);
    if (!record) {
      return { isValid: false, reason: 'Evidence record not found in system.' };
    }

    if (record.isPurged || record.status === 'PURGED') {
      return {
        isValid: false,
        record,
        reason: 'Evidence payload was purged under source retention rules. Proposal is STALE and requires re-collection.'
      };
    }

    if (record.expiresAt) {
      const asOfTime = new Date(asOfDateIso).getTime();
      const expTime = new Date(record.expiresAt).getTime();
      if (expTime <= asOfTime) {
        return {
          isValid: false,
          record,
          reason: 'Evidence timestamp is expired. Proposal is STALE and requires re-collection.'
        };
      }
    }

    return { isValid: true, record };
  }
}
