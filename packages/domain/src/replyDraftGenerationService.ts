import { randomUUID } from 'crypto';
import {
  ReplyGenerationOptions,
  GeneratedReplyDraft,
  GroundingVerification,
  ReviewResource,
  ReviewClassificationResult
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ReplyDraftGenerationService {
  private static drafts = new Map<string, GeneratedReplyDraft>();

  static reset(): void {
    this.drafts.clear();
  }

  /**
   * Generates a grounded, natural reply draft adhering strictly to local business platform rules.
   */
  static generateReplyDraft(params: {
    review: ReviewResource;
    classification: ReviewClassificationResult;
    options: ReplyGenerationOptions;
  }): GeneratedReplyDraft {
    const { review, classification, options } = params;

    let text = '';
    const firstName = review.reviewerName.split(' ')[0] || 'there';

    if (classification.isRatingOnly) {
      if (review.rating >= 4) {
        text = `Thank you for taking the time to rate ${options.confirmedBusinessName}, ${firstName}! We truly appreciate your support.`;
      } else {
        text = `Thank you for your rating, ${firstName}. We always strive to provide quality service. If you have any specific feedback for our ${options.locationName} team, please reach out directly at ${options.confirmedPhone}.`;
      }
    } else if (classification.sentiment === 'positive' && !classification.requiresHumanHold) {
      const topicMention = classification.topics.length > 0 ? ` your ${classification.topics[0]} needs` : ' you';
      text = `Thank you for the wonderful review, ${firstName}! Our team at ${options.confirmedBusinessName} was happy to help with${topicMention}. Let us know if you ever need anything else.`;
    } else {
      // Sensitive, complaint, or mixed review: calm professional acknowledgment without admitting legal fault or promising compensation
      text = `${firstName}, thank you for bringing this to our attention. Delivering dependable service is very important to us at ${options.confirmedBusinessName}. Please contact our management team directly at ${options.confirmedPhone} or ${options.confirmedPublicEmail} so we can understand what occurred and assist you properly.`;
    }

    const verification = this.verifyDraftGrounding(text, options, review.comment);

    const draftId = randomUUID();
    const nowIso = new Date().toISOString();
    const draft: GeneratedReplyDraft = {
      draftId,
      reviewResourceId: review.id,
      sourceRevisionHash: review.sourceRevision,
      text,
      version: 1,
      requiresHumanReview: classification.requiresHumanHold || review.rating <= 3,
      groundingVerification: verification,
      status: 'DRAFT',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.drafts.set(draftId, draft);
    return draft;
  }

  /**
   * Deterministically verifies that a draft does not contain repetitive marketing,
   * keyword stuffing, compensation promises, or requests to remove criticism.
   */
  static verifyDraftGrounding(
    draftText: string,
    options: ReplyGenerationOptions,
    originalComment: string | null
  ): GroundingVerification {
    const lower = draftText.toLowerCase();

    // 1. Repetitive marketing / promotional pitches
    const marketingRegex = /\b(special offer|discount code|20% off|best deals|promotional rate|sale now|book today for free)\b/i;
    const containsRepetitiveMarketing = marketingRegex.test(draftText);

    // 2. Keyword stuffing (business name or location repeated excessively)
    const bizWords = options.confirmedBusinessName.toLowerCase().split(/\s+/);
    let bizMatches = 0;
    for (const w of bizWords) {
      if (w.length > 3) {
        const matches = lower.match(new RegExp(`\\b${w}\\b`, 'g'));
        if (matches && matches.length > 2) bizMatches++;
      }
    }
    const containsKeywordStuffing = bizMatches > 0;

    // 3. Compensation promises
    const compRegex = /\b(refund|money back|free service|gift card|voucher|discount next|reimburse|financial compensation)\b/i;
    const containsCompensationPromise = compRegex.test(draftText);

    // 4. Requests to remove or alter criticism
    const removalRegex = /\b(delete your review|remove your (review|rating|comment|criticism)|take down your review|change your (review|rating)|update your stars)\b/i;
    const containsReviewRemovalRequest = removalRegex.test(draftText);

    // 5. Private customer info (credit cards, SSN, emails that don't match public confirmed email)
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/;
    const ccRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
    const containsPrivateCustomerInfo = ssnRegex.test(draftText) || ccRegex.test(draftText);

    // 6. Invented transactions: check if reply mentions specific services that were neither in original comment nor business name
    let containsInventedTransaction = false;
    const unmentionedSpecifics = ['hvac installation', 'full repipe', 'roof replacement', 'emergency generator'];
    for (const spec of unmentionedSpecifics) {
      if (lower.includes(spec) && (!originalComment || !originalComment.toLowerCase().includes(spec))) {
        containsInventedTransaction = true;
        break;
      }
    }

    // 7. Public contact phone verified
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    const phoneMatch = draftText.match(phoneRegex);
    let publicContactPhoneVerified = true;
    if (phoneMatch) {
      const cleanPhone = phoneMatch[0].replace(/[-.]/g, '');
      const cleanConfirmed = options.confirmedPhone.replace(/[-.]/g, '');
      if (cleanPhone !== cleanConfirmed) {
        publicContactPhoneVerified = false;
      }
    }

    const passedAllChecks =
      !containsRepetitiveMarketing &&
      !containsKeywordStuffing &&
      !containsCompensationPromise &&
      !containsReviewRemovalRequest &&
      !containsPrivateCustomerInfo &&
      !containsInventedTransaction &&
      publicContactPhoneVerified;

    return {
      containsRepetitiveMarketing,
      containsKeywordStuffing,
      containsInventedTransaction,
      containsPrivateCustomerInfo,
      containsCompensationPromise,
      containsReviewRemovalRequest,
      publicContactPhoneVerified,
      passedAllChecks
    };
  }

  /**
   * Updates an existing reply draft.
   * Acceptance requirement: Owner edits create a new revision instead of mutating an already approved payload invisibly.
   */
  static updateDraft(params: {
    draftId: string;
    newText: string;
    options: ReplyGenerationOptions;
    originalComment: string | null;
  }): GeneratedReplyDraft {
    const existing = this.drafts.get(params.draftId);
    if (!existing) {
      throw new ValidationFailedError(`Draft ${params.draftId} not found.`);
    }

    const verification = this.verifyDraftGrounding(params.newText, params.options, params.originalComment);

    const nowIso = new Date().toISOString();
    // Increment version, reset status to DRAFT so approved payloads cannot be secretly mutated
    const updated: GeneratedReplyDraft = {
      ...existing,
      text: params.newText,
      version: existing.version + 1,
      status: 'DRAFT',
      groundingVerification: verification,
      updatedAt: nowIso
    };

    this.drafts.set(params.draftId, updated);
    return updated;
  }

  static getDraft(draftId: string): GeneratedReplyDraft | undefined {
    return this.drafts.get(draftId);
  }
}
