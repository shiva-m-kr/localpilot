export type BrandVoice = 'professional_warm' | 'concise_direct' | 'courteous_friendly';

export interface ReplyGenerationOptions {
  brandVoice?: BrandVoice;
  confirmedBusinessName: string;
  confirmedPhone: string;
  confirmedPublicEmail: string;
  locationName: string;
}

export interface GroundingVerification {
  containsRepetitiveMarketing: boolean;
  containsKeywordStuffing: boolean;
  containsInventedTransaction: boolean;
  containsPrivateCustomerInfo: boolean;
  containsCompensationPromise: boolean;
  containsReviewRemovalRequest: boolean;
  publicContactPhoneVerified: boolean;
  passedAllChecks: boolean;
}

export interface GeneratedReplyDraft {
  draftId: string;
  reviewResourceId: string;
  sourceRevisionHash: string;
  text: string;
  version: number;
  requiresHumanReview: boolean;
  groundingVerification: GroundingVerification;
  status: 'DRAFT' | 'APPROVED' | 'STALE';
  createdAt: string;
  updatedAt: string;
}
