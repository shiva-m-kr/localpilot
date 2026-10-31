import { ReviewSentiment } from './reviews.js';

export type ReviewRiskFlag =
  | 'SARCASTIC_CONTRADICTION'
  | 'PRIVACY_VIOLATION'
  | 'COMPLAINT'
  | 'REFUND_REQUEST'
  | 'SAFETY_LEGAL_MEDICAL'
  | 'MALICIOUS_INSTRUCTION'
  | 'UNSUPPORTED_LANGUAGE';

export interface LanguageAssessment {
  code: string;
  confidence: number;
  isSupported: boolean;
  isCodeSwitched: boolean;
}

export interface ReviewClassificationResult {
  sentiment: ReviewSentiment;
  topics: string[];
  language: LanguageAssessment;
  riskFlags: ReviewRiskFlag[];
  requiresHumanHold: boolean;
  holdReason: string | null;
  isRatingOnly: boolean;
}

export interface ReviewClassificationInput {
  rating: number; // 1 to 5
  comment: string | null;
  reviewerName: string;
}
