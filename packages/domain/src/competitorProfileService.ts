import { randomUUID } from 'crypto';
import {
  CompetitorEvidenceProfile,
  CompetitorRatingEvidence,
  CompetitorSerpOverlap,
  EvidenceMetricSource
} from '@localpilot/contracts';

export class CompetitorProfileService {
  private static profiles = new Map<string, CompetitorEvidenceProfile>();

  static reset(): void {
    this.profiles.clear();
  }

  /**
   * Builds a comparable competitor evidence profile enforcing truth-in-metrics rules.
   */
  static buildEvidenceProfile(params: {
    competitorId: string;
    organizationId: string;
    locationId: string;
    businessName: string;
    primaryCategory: string;
    observedServices?: string[];
    observedRating?: number;
    sampleReviewCount?: number;
    totalEstimatedReviews?: number;
    top3Appearances: number;
    totalSampledGridPoints: number;
    geographicScopeLabel: string; // e.g. "North Austin"
  }): CompetitorEvidenceProfile {
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days retention

    // 1. Review Evidence: Clearly distinguish sampled vs all
    const isSampled = Boolean(params.sampleReviewCount && params.totalEstimatedReviews && params.sampleReviewCount < params.totalEstimatedReviews);
    const ratingEvidence: CompetitorRatingEvidence = {
      rating: params.observedRating !== undefined ? params.observedRating : null,
      sampleReviewCount: params.sampleReviewCount,
      totalEstimatedReviewCount: params.totalEstimatedReviews,
      isSampledOnly: isSampled,
      source: 'LICENSED_SERP_OBSERVATION'
    };

    // 2. Overlap Metric: Explicitly define definition rather than calling it "market share"
    const overlapRatePercent = Number(
      ((params.top3Appearances / params.totalSampledGridPoints) * 100).toFixed(2)
    );
    const serpOverlap: CompetitorSerpOverlap = {
      top3AppearanceCount: params.top3Appearances,
      totalSampledPoints: params.totalSampledGridPoints,
      overlapRatePercent,
      definitionText: `Top-3 rank appearance rate across ${params.totalSampledGridPoints} sampled points in ${params.geographicScopeLabel}. Represents local query overlap on Google Maps, not total commercial market share.`
    };

    // 3. Truth-in-Metrics: Never fabricate missing backlinks or keyword volumes
    const backlinkMetric = {
      count: null,
      isUnavailable: true,
      source: 'UNAVAILABLE' as EvidenceMetricSource,
      explanation: 'Backlink authority index is unavailable under current read-only provider tier. Values are not invented.'
    };

    const keywordVolumeMetric = {
      volume: null,
      isUnavailable: true,
      source: 'UNAVAILABLE' as EvidenceMetricSource,
      explanation: 'Keyword search volume not estimated without verified search provider dataset.'
    };

    const profile: CompetitorEvidenceProfile = {
      profileId: randomUUID(),
      competitorId: params.competitorId,
      organizationId: params.organizationId,
      locationId: params.locationId,
      businessName: params.businessName,
      ratingEvidence,
      primaryCategory: params.primaryCategory,
      observedServices: params.observedServices || [],
      backlinkMetric,
      keywordVolumeMetric,
      serpOverlap,
      profileObservedAt: now.toISOString(),
      profileExpiresAt: expiry.toISOString()
    };

    this.profiles.set(params.competitorId, profile);
    return profile;
  }

  static getProfile(competitorId: string): CompetitorEvidenceProfile | undefined {
    return this.profiles.get(competitorId);
  }
}
