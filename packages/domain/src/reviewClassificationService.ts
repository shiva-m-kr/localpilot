import {
  ReviewClassificationInput,
  ReviewClassificationResult,
  ReviewRiskFlag,
  LanguageAssessment,
  ReviewSentiment
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ReviewClassificationService {
  private static readonly SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

  // Prompt injection & malicious instructions patterns
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /system:\s*/i,
    /<system>/i,
    /grant\s+(admin|role|permission)/i,
    /bypass\s+(security|auth|filter)/i,
    /eval\s*\(/i,
    /drop\s+table/i,
    /publish\s+the\s+following\s+unrelated/i
  ];

  // Sarcasm and contradiction indicators in high-rating reviews
  private static readonly CONTRADICTION_PATTERNS = [
    /if you (love|enjoy|like) (having|being|waiting)/i,
    /best\s+.*\s+if you want/i,
    /5\s+stars?\s+for\s+(destroying|ruining|flooding|breaking)/i,
    /never\s+again/i,
    /nightmare/i,
    /disaster/i,
    /scam/i,
    /sewage\s+flood/i,
    /terrible/i,
    /worst\s+(plumber|service|experience|company)/i
  ];

  // Safety, legal and medical risk indicators
  private static readonly SAFETY_LEGAL_PATTERNS = [
    /\b(lawyer|attorney|lawsuit|legal action|sue|court)\b/i,
    /\b(police|cops|fraud|stolen|theft)\b/i,
    /\b(hospital|emergency room|injur|poison|carbon monoxide|fire hazard|gas leak)\b/i
  ];

  // Refund and billing disputes
  private static readonly REFUND_PATTERNS = [
    /\b(refund|money back|chargeback|overcharged|billing dispute|unauthorized charge)\b/i
  ];

  // Privacy violation (SSN, credit card, phone numbers in public review)
  private static readonly PRIVACY_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(?:\d{4}[ -]?){3}\d{4}\b/, // 16 digit credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
  ];

  /**
   * Classifies review sentiment, extracts topics, assesses language, and evaluates safety/risk flags.
   */
  static classifyReview(input: ReviewClassificationInput): ReviewClassificationResult {
    if (input.rating < 1 || input.rating > 5) {
      throw new ValidationFailedError(`Rating must be 1 to 5, received ${input.rating}`);
    }

    const text = input.comment ? input.comment.trim() : '';
    const isRatingOnly = text.length === 0;

    // 1. Rating-only review handling: strictly do not invent service details or topics
    if (isRatingOnly) {
      let sentiment: ReviewSentiment = 'neutral';
      if (input.rating >= 4) sentiment = 'positive';
      else if (input.rating <= 2) sentiment = 'negative';

      return {
        sentiment,
        topics: [], // Crucial: No hallucinated service topics
        language: {
          code: 'en',
          confidence: 1.0,
          isSupported: true,
          isCodeSwitched: false
        },
        riskFlags: input.rating <= 2 ? ['COMPLAINT'] : [],
        requiresHumanHold: input.rating <= 2,
        holdReason: input.rating <= 2 ? 'Low star rating without comment requires owner review' : null,
        isRatingOnly: true
      };
    }

    const riskFlags: ReviewRiskFlag[] = [];

    // 2. Prompt injection detection
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        riskFlags.push('MALICIOUS_INSTRUCTION');
        break;
      }
    }

    // 3. Sarcastic contradiction detection (4-5 stars with complaint patterns)
    let isSarcastic = false;
    if (input.rating >= 4) {
      for (const pattern of this.CONTRADICTION_PATTERNS) {
        if (pattern.test(text)) {
          isSarcastic = true;
          riskFlags.push('SARCASTIC_CONTRADICTION');
          break;
        }
      }
    }

    // 4. Safety / Legal / Medical detection
    for (const pattern of this.SAFETY_LEGAL_PATTERNS) {
      if (pattern.test(text)) {
        riskFlags.push('SAFETY_LEGAL_MEDICAL');
        break;
      }
    }

    // 5. Refund requests
    for (const pattern of this.REFUND_PATTERNS) {
      if (pattern.test(text)) {
        riskFlags.push('REFUND_REQUEST');
        break;
      }
    }

    // 6. Privacy violations
    for (const pattern of this.PRIVACY_PATTERNS) {
      if (pattern.test(text)) {
        riskFlags.push('PRIVACY_VIOLATION');
        break;
      }
    }

    // General complaint check
    if (input.rating <= 2 || text.toLowerCase().includes('complaint') || text.toLowerCase().includes('unacceptable')) {
      if (!riskFlags.includes('COMPLAINT')) {
        riskFlags.push('COMPLAINT');
      }
    }

    // 7. Language and code-switching evaluation
    const language = this.evaluateLanguage(text);
    if (!language.isSupported || language.confidence < 0.7 || language.isCodeSwitched) {
      riskFlags.push('UNSUPPORTED_LANGUAGE');
    }

    // 8. Determine Sentiment
    let sentiment: ReviewSentiment;
    if (isSarcastic) {
      sentiment = 'negative'; // Override 5-star rating to negative due to sarcasm
    } else if (input.rating >= 4) {
      sentiment = riskFlags.includes('COMPLAINT') ? 'mixed' : 'positive';
    } else if (input.rating <= 2) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    // 9. Extract topics only from actual words present in text
    const topics = this.extractGroundedTopics(text);

    // 10. Human hold assessment
    const requiresHumanHold =
      riskFlags.length > 0 ||
      sentiment === 'negative' ||
      sentiment === 'mixed';

    let holdReason: string | null = null;
    if (requiresHumanHold) {
      if (riskFlags.includes('MALICIOUS_INSTRUCTION')) {
        holdReason = 'Quarantined: Prompt injection attempt detected in review text.';
      } else if (riskFlags.includes('SARCASTIC_CONTRADICTION')) {
        holdReason = 'Held: Sarcastic contradiction detected (5-star rating with severe complaint).';
      } else if (riskFlags.includes('SAFETY_LEGAL_MEDICAL')) {
        holdReason = 'Held: Safety, legal or medical escalation detected in review text.';
      } else if (riskFlags.includes('UNSUPPORTED_LANGUAGE')) {
        holdReason = 'Held: Unsupported, low-confidence or code-switched language requires human review.';
      } else {
        holdReason = `Requires owner review due to ${riskFlags.join(', ') || sentiment + ' sentiment'}.`;
      }
    }

    return {
      sentiment,
      topics,
      language,
      riskFlags,
      requiresHumanHold,
      holdReason,
      isRatingOnly: false
    };
  }

  private static evaluateLanguage(text: string): LanguageAssessment {
    // Check for mixed non-latin scripts (e.g. Cyrillic, Arabic, Chinese) or code-switching
    const hasCyrillic = /[\u0400-\u04FF]/.test(text);
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasChinese = /[\u4E00-\u9FFF]/.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);

    if (hasChinese || hasArabic || hasCyrillic) {
      const isCodeSwitched = hasLatin && (hasCyrillic || hasArabic || hasChinese);
      return {
        code: hasChinese ? 'zh' : hasArabic ? 'ar' : 'ru',
        confidence: isCodeSwitched ? 0.5 : 0.8,
        isSupported: false, // LocalPilot MVP supports English, Spanish, French, German
        isCodeSwitched
      };
    }

    // Simple language heuristic for supported Western European languages
    const lower = text.toLowerCase();
    if (lower.includes('gracias') || lower.includes('excelente servicio') || lower.includes('muy bueno')) {
      return { code: 'es', confidence: 0.95, isSupported: true, isCodeSwitched: false };
    }
    if (lower.includes('merci') || lower.includes('très bon')) {
      return { code: 'fr', confidence: 0.95, isSupported: true, isCodeSwitched: false };
    }
    if (lower.includes('danke') || lower.includes('sehr gut')) {
      return { code: 'de', confidence: 0.95, isSupported: true, isCodeSwitched: false };
    }

    return {
      code: 'en',
      confidence: 0.98,
      isSupported: true,
      isCodeSwitched: false
    };
  }

  private static extractGroundedTopics(text: string): string[] {
    const candidateKeywords = [
      'plumbing',
      'drain',
      'leak',
      'water heater',
      'toilet',
      'pipe',
      'pricing',
      'dispatcher',
      'technician',
      'punctual',
      'emergency',
      'clean'
    ];

    const lower = text.toLowerCase();
    const found: string[] = [];

    for (const kw of candidateKeywords) {
      if (lower.includes(kw)) {
        found.push(kw);
      }
    }

    return found;
  }
}
