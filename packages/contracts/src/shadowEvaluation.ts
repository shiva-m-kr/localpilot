import { ReviewSentiment } from './reviews.js';
import { ReviewRiskFlag } from './reviewClassification.js';

export interface ShadowEvaluationBenchmarkItem {
  benchmarkId: string;
  description: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  expectedSentiment: ReviewSentiment;
  expectedShouldHold: boolean;
  expectedEligibility: boolean;
  knownRiskFlags: ReviewRiskFlag[];
}

export interface ShadowEvaluationResultItem {
  benchmarkId: string;
  description: string;
  actualSentiment: ReviewSentiment;
  actualRiskFlags: ReviewRiskFlag[];
  actualShouldHold: boolean;
  actualEligibility: boolean;
  groundingPassed: boolean;
  generatedReplyText: string;
  isFalseEligible: boolean;
  isUnknownOutcome: boolean;
}

export interface ShadowEvaluationScore {
  totalEvaluated: number;
  groundingScorePercent: number;
  policyAdherenceScorePercent: number;
  safetyScorePercent: number;
  falseEligibilityCount: number;
  unknownOutcomesCount: number;
  disclaimer: string;
  items: ShadowEvaluationResultItem[];
}
