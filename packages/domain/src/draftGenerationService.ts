import { randomUUID } from 'crypto';
import {
  StructuredDraft,
  ContentBlock,
  DraftValidationIssue,
  ClaimReference,
  DraftStatus
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface GroundingContext {
  organizationId: string;
  locationId: string;
  businessName: string;
  phone: string;
  addressVisibility: 'PUBLIC_COMMERCIAL' | 'HIDDEN_RESIDENTIAL' | 'SERVICE_AREA_ONLY';
  streetAddress?: string;
  is247: boolean;
  confirmedPricing: Record<string, number | string>;
}

export class DraftGenerationService {
  private static readonly MAX_REPAIR_ATTEMPTS = 2;

  /**
   * Deterministically validates a structured draft against business facts,
   * link safety, repeated filler, and prompt injection patterns.
   */
  static validateDraft(
    draft: {
      title: string;
      metaDescription: string;
      blocks: ContentBlock[];
      internalLinks: string[];
      outboundLinks: string[];
    },
    context: GroundingContext
  ): {
    status: DraftStatus;
    issues: DraftValidationIssue[];
    claims: ClaimReference[];
  } {
    const issues: DraftValidationIssue[] = [];
    const claims: ClaimReference[] = [];

    const fullText = [
      draft.title,
      draft.metaDescription,
      ...draft.blocks.map((b) => b.content)
    ].join(' ');

    // 1. Check prompt injection
    if (/ignore\s+all\s+previous\s+instructions|system\s+override|prompt\s+leak|disregard\s+safety/i.test(fullText)) {
      issues.push({
        code: 'PROMPT_INJECTION_DETECTED',
        severity: 'BLOCKER',
        message: 'Malicious prompt injection instructions detected in generated draft.'
      });
    }

    // 2. Check SAB Residential Address Privacy
    if (
      (context.addressVisibility === 'HIDDEN_RESIDENTIAL' || context.addressVisibility === 'SERVICE_AREA_ONLY') &&
      context.streetAddress &&
      context.streetAddress.trim().length > 4
    ) {
      if (fullText.toLowerCase().includes(context.streetAddress.toLowerCase())) {
        issues.push({
          code: 'ADDRESS_LEAK_SAB',
          severity: 'BLOCKER',
          message: `Privacy violation: Hidden residential street address "${context.streetAddress}" leaked into public draft.`
        });
      }
    }

    // 3. Fake 24/7 Hours Claim
    if (!context.is247) {
      if (/\b(24\/7|open 24 hours|around the clock|open all night)\b/i.test(fullText)) {
        issues.push({
          code: 'FAKE_HOURS_CLAIM',
          severity: 'BLOCKER',
          message: 'Content claims 24/7 availability, but business hours do not confirm 24/7 operation.'
        });
      }
    }

    // 4. Unsupported Pricing / Unknown prices stay unknown
    const priceMatches = fullText.match(/\$\s*\d+(?:\.\d{2})?|\b\d+\s*(?:dollars|cad|usd)\b/gi);
    if (priceMatches && priceMatches.length > 0) {
      const knownPrices = Object.values(context.confirmedPricing).map((p) => String(p));
      const hasUnconfirmedPrice = priceMatches.some((match) => {
        const numeric = match.replace(/[^0-9.]/g, '');
        return !knownPrices.some((kp) => kp.includes(numeric));
      });

      if (hasUnconfirmedPrice) {
        issues.push({
          code: 'UNSUPPORTED_PRICING',
          severity: 'BLOCKER',
          message: 'Draft includes specific prices not present in confirmed pricing schedule.'
        });
      }
    }

    // 5. Link Safety & SSRF Disallowance
    for (const urlStr of [...draft.internalLinks, ...draft.outboundLinks]) {
      try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname.toLowerCase();
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '169.254.169.254' ||
          host.startsWith('10.') ||
          host.startsWith('192.168.') ||
          host.endsWith('.internal') ||
          host.endsWith('.local')
        ) {
          issues.push({
            code: 'UNSAFE_LINK_SSRF',
            severity: 'BLOCKER',
            message: `Disallowed dangerous link target: ${urlStr}`
          });
        }
      } catch {
        issues.push({
          code: 'UNSAFE_LINK_SSRF',
          severity: 'BLOCKER',
          message: `Invalid URL format: ${urlStr}`
        });
      }
    }

    // 6. Repeated Filler Detection (low-quality AI content loop)
    const fillerPatterns = [
      /in this fast-paced world/gi,
      /when it comes to .*, it is important to remember/gi,
      /look no further than/gi,
      /without further ado/gi
    ];
    let fillerCount = 0;
    for (const pattern of fillerPatterns) {
      const match = fullText.match(pattern);
      if (match) fillerCount += match.length;
    }
    if (fillerCount >= 3) {
      issues.push({
        code: 'REPEATED_FILLER_DETECTED',
        severity: 'WARNING',
        message: 'Draft contains excessive generic boilerplate filler.'
      });
    }

    // Determine final status
    const hasBlockers = issues.some((i) => i.severity === 'BLOCKER');
    const hasWarnings = issues.some((i) => i.severity === 'WARNING');

    let status: DraftStatus = 'VALIDATION_PASSED';
    if (hasBlockers) {
      status = 'VALIDATION_FAILED';
    } else if (hasWarnings) {
      status = 'NEEDS_HUMAN_REVIEW';
    }

    return { status, issues, claims };
  }

  /**
   * Creates a structured draft with intermediate checkpoint and bounded repair attempts.
   */
  static createDraftCheckpoint(
    input: {
      organizationId: string;
      locationId: string;
      campaignPlanId?: string;
      title: string;
      metaDescription: string;
      blocks: ContentBlock[];
      internalLinks?: string[];
      outboundLinks?: string[];
      repairAttempts?: number;
    },
    context: GroundingContext
  ): StructuredDraft {
    const internalLinks = input.internalLinks || [];
    const outboundLinks = input.outboundLinks || [];
    const repairAttempts = input.repairAttempts || 0;

    const validation = this.validateDraft(
      {
        title: input.title,
        metaDescription: input.metaDescription,
        blocks: input.blocks,
        internalLinks,
        outboundLinks
      },
      context
    );

    let finalStatus = validation.status;
    if (finalStatus === 'VALIDATION_FAILED' && repairAttempts >= this.MAX_REPAIR_ATTEMPTS) {
      // Bounded retry rule: Rejections do not silently consume unlimited retries
      finalStatus = 'NEEDS_HUMAN_REVIEW';
    }

    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      campaignPlanId: input.campaignPlanId,
      title: input.title,
      metaDescription: input.metaDescription,
      blocks: input.blocks,
      claims: validation.claims,
      internalLinks,
      outboundLinks,
      status: finalStatus,
      validationIssues: validation.issues,
      repairAttempts,
      maxRepairAttempts: this.MAX_REPAIR_ATTEMPTS,
      createdAt: now,
      updatedAt: now
    };
  }
}
