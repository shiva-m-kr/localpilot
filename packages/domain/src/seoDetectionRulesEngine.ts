import { randomUUID } from 'crypto';
import {
  DeterministicFinding,
  RuleFindingCategory,
  RuleSeverity
} from '@localpilot/contracts';

export class SeoDetectionRulesEngine {
  /**
   * Normalizes phone numbers to digits only for comparison.
   */
  static normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * Normalizes street addresses to eliminate harmless abbreviation differences.
   */
  static normalizeAddress(addr: string): string {
    return addr
      .toLowerCase()
      .replace(/\bsuite\b/g, 'ste')
      .replace(/\bstreet\b/g, 'st')
      .replace(/\broad\b/g, 'rd')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\bboulevard\b/g, 'blvd')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Evaluates citation consistency, distinguishing harmless formatting from actual contradictions.
   */
  static evaluateCitation(params: {
    confirmedPhone: string;
    observedPhone: string;
    confirmedAddress?: string;
    observedAddress?: string;
    evidenceRecordId?: string;
  }): DeterministicFinding | null {
    const normConfirmedPhone = this.normalizePhone(params.confirmedPhone);
    const normObservedPhone = this.normalizePhone(params.observedPhone);

    // True phone contradiction
    if (normConfirmedPhone !== normObservedPhone) {
      return {
        id: randomUUID(),
        ruleId: 'RULE-CIT-001',
        ruleVersion: 1,
        category: 'CITATION_MISMATCH',
        severity: 'CRITICAL',
        title: 'Phone Number Contradiction Detected',
        factualSummary: `Observed phone "${params.observedPhone}" differs from confirmed business phone "${params.confirmedPhone}".`,
        evidenceRecordIds: params.evidenceRecordId ? [params.evidenceRecordId] : [],
        remediationAdvice: 'Update directory listing or GBP profile to match your primary confirmed telephone number.',
        isHarmlessFormatting: false,
        detectedAt: new Date().toISOString()
      };
    }

    // Address check
    if (params.confirmedAddress && params.observedAddress) {
      const normConfAddr = this.normalizeAddress(params.confirmedAddress);
      const normObsAddr = this.normalizeAddress(params.observedAddress);

      if (normConfAddr !== normObsAddr) {
        // True address difference
        return {
          id: randomUUID(),
          ruleId: 'RULE-CIT-002',
          ruleVersion: 1,
          category: 'CITATION_MISMATCH',
          severity: 'CRITICAL',
          title: 'Physical Address Discrepancy',
          factualSummary: `Observed address "${params.observedAddress}" does not match confirmed physical address "${params.confirmedAddress}".`,
          evidenceRecordIds: params.evidenceRecordId ? [params.evidenceRecordId] : [],
          remediationAdvice: 'Correct the street address on the citation source to maintain accurate customer directions.',
          isHarmlessFormatting: false,
          detectedAt: new Date().toISOString()
        };
      }
    }

    // Harmless formatting difference only (or identical): return null (no false alarm!)
    return null;
  }

  /**
   * Evaluates operating hours consistency.
   */
  static evaluateHours(params: {
    confirmedHours: string;
    observedHours: string;
    evidenceRecordId?: string;
  }): DeterministicFinding | null {
    if (params.confirmedHours.trim().toLowerCase() !== params.observedHours.trim().toLowerCase()) {
      return {
        id: randomUUID(),
        ruleId: 'RULE-HRS-001',
        ruleVersion: 1,
        category: 'INCONSISTENT_HOURS',
        severity: 'WARNING',
        title: 'Operating Hours Inconsistency',
        factualSummary: `Confirmed business hours "${params.confirmedHours}" disagree with published schedule "${params.observedHours}".`,
        evidenceRecordIds: params.evidenceRecordId ? [params.evidenceRecordId] : [],
        prerequisiteRequired: 'Owner must confirm current holiday and weekend schedule before updating.',
        remediationAdvice: 'Synchronize hours across GBP and website so customers do not arrive during closed hours.',
        isHarmlessFormatting: false,
        detectedAt: new Date().toISOString()
      };
    }
    return null;
  }

  /**
   * Evaluates booking link and indexability.
   */
  static evaluateTechnicalHealth(params: {
    bookingUrl: string;
    httpStatusCode: number;
    isNoIndexDirectivePresent: boolean;
    evidenceRecordId?: string;
  }): DeterministicFinding[] {
    const findings: DeterministicFinding[] = [];
    const nowIso = new Date().toISOString();

    if (params.httpStatusCode >= 400) {
      findings.push({
        id: randomUUID(),
        ruleId: 'RULE-TECH-001',
        ruleVersion: 1,
        category: 'BROKEN_BOOKING_LINK',
        severity: 'CRITICAL',
        title: 'Primary Booking Destination Returns Error',
        factualSummary: `Booking URL ${params.bookingUrl} returned HTTP status ${params.httpStatusCode}.`,
        evidenceRecordIds: params.evidenceRecordId ? [params.evidenceRecordId] : [],
        remediationAdvice: 'Restore the booking page or update the CTA destination URL immediately to prevent customer loss.',
        isHarmlessFormatting: false,
        detectedAt: nowIso
      });
    }

    if (params.isNoIndexDirectivePresent) {
      findings.push({
        id: randomUUID(),
        ruleId: 'RULE-TECH-002',
        ruleVersion: 1,
        category: 'INDEXABILITY_PROBLEM',
        severity: 'CRITICAL',
        title: 'Service Page Blocked by "noindex" Meta Tag',
        factualSummary: `Key service page contains <meta name="robots" content="noindex">, blocking public search visibility.`,
        evidenceRecordIds: params.evidenceRecordId ? [params.evidenceRecordId] : [],
        remediationAdvice: 'Remove the noindex tag from your production CMS template.',
        isHarmlessFormatting: false,
        detectedAt: nowIso
      });
    }

    return findings;
  }
}
