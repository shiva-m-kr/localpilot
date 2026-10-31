export interface ReputationAnalyticsReport {
  organizationId: string;
  locationId: string;
  officialProviderRating: number;
  officialProviderReviewCount: number;
  sampledWindow: {
    startDate: string;
    endDate: string;
    sampleSize: number;
    sampleAverageRating: number;
    isSparseData: boolean;
    sparseDataConfidenceDisclaimer: string | null;
  };
  responseCoverage: {
    accessibleReviewCount: number;
    repliedReviewCount: number;
    coveragePercent: number;
  };
  knownResponseTime: {
    medianResponseHours: number | null;
    measuredEventsCount: number;
  };
  draftWorkflowStats: {
    totalDraftsGenerated: number;
    approvedAsIsCount: number;
    editedByOwnerCount: number;
    editRatePercent: number;
  };
  autoEligibilityBreakdown: Record<string, number>;
  sampledThemes: Array<{ theme: string; count: number; sentiment: 'positive' | 'negative' }>;
  anomalies: Array<{
    description: string;
    classification: 'VOLUME_ANOMALY_INVESTIGATE';
    accusesOfFraud: false;
  }>;
  antiGatingRuleDisclaimer: string;
}
