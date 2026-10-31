import { ValidationFailedError } from './errors.js';

export interface GroundingClaim {
  claimText: string;
  factKey?: string;
  evidenceId?: string;
  isVerifiedTrue: boolean;
  violationReason?: string;
}

export interface GroundingValidationResult {
  passed: boolean;
  claims: GroundingClaim[];
  violations: string[];
}

export class GroundingValidator {
  /**
   * Deterministically validates generated content against confirmed business facts,
   * rejecting invented availability, fake pricing, or leaks of hidden residential addresses.
   */
  static validateGroundedOutput(
    generatedText: string,
    confirmedFacts: Record<string, any>,
    addressVisibility: 'PUBLIC_COMMERCIAL' | 'HIDDEN_RESIDENTIAL' | 'SERVICE_AREA_ONLY',
    rawStreetAddress?: string
  ): GroundingValidationResult {
    const violations: string[] = [];
    const claims: GroundingClaim[] = [];

    // 1. Hidden Address Leak Check
    if (
      (addressVisibility === 'HIDDEN_RESIDENTIAL' || addressVisibility === 'SERVICE_AREA_ONLY') &&
      rawStreetAddress &&
      rawStreetAddress.trim().length > 4
    ) {
      if (generatedText.toLowerCase().includes(rawStreetAddress.toLowerCase())) {
        violations.push(
          `Privacy Violation: Hidden residential street address "${rawStreetAddress}" leaked into generated public content.`
        );
      }
    }

    // 2. Fake Availability / 24-7 Check
    const operates247 = confirmedFacts['is_24_7']?.value === true;
    if (!operates247) {
      const claims247 = /\b(24\/7|open 24 hours|around the clock|24 hour service)\b/i.test(generatedText);
      if (claims247) {
        violations.push(
          'Invented Availability: Content claims 24/7 emergency service, but confirmed business hours do not support 24/7 operation.'
        );
      }
    }

    // 3. Invented Pricing Check: Check if currency values appear without confirmed pricing facts
    const confirmedPriceFacts = Object.keys(confirmedFacts).filter((k) => k.includes('price') || k.includes('fee'));
    if (confirmedPriceFacts.length === 0) {
      const priceMatch = /\$\s*\d+(?:\.\d{2})?|\b\d+\s*(?:dollars|cad|usd)\b/i.test(generatedText);
      if (priceMatch) {
        violations.push(
          'Invented Pricing: Content advertises specific prices or dollar discounts, but business facts contain no confirmed pricing schedule.'
        );
      }
    }

    // 4. Prompt Injection Containment
    if (/ignore\s+previous\s+instructions|system\s+prompt|disregard\s+all\s+rules/i.test(generatedText)) {
      violations.push('Prompt Injection: Malicious override instruction detected in content.');
    }

    return {
      passed: violations.length === 0,
      claims,
      violations
    };
  }

  /**
   * Asserts grounding and throws ValidationFailedError if ungrounded claims are detected.
   */
  static assertGroundedOutput(
    generatedText: string,
    confirmedFacts: Record<string, any>,
    addressVisibility: 'PUBLIC_COMMERCIAL' | 'HIDDEN_RESIDENTIAL' | 'SERVICE_AREA_ONLY',
    rawStreetAddress?: string
  ): void {
    const result = this.validateGroundedOutput(
      generatedText,
      confirmedFacts,
      addressVisibility,
      rawStreetAddress
    );

    if (!result.passed) {
      throw new ValidationFailedError(
        `Grounded Output Validation Failed: ${result.violations.join(' | ')}`,
        { violations: result.violations }
      );
    }
  }
}
