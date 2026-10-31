import { randomUUID } from 'crypto';
import {
  PrioritizedRecommendation,
  HeuristicFactors,
  HardGateCheck
} from '@localpilot/contracts';

export class RecommendationRankingService {
  /**
   * Computes internal priority score and transparent factor reason breakdown.
   * Labeled strictly as "internal priority score", NOT probability of ranking success.
   */
  static computePriorityScore(factors: HeuristicFactors): {
    score: number;
    reasonBreakdown: Record<string, string>;
  } {
    // Numerator: High confidence, impact, relevance, gap, urgency
    const numerator =
      factors.confidence *
      factors.impact *
      factors.relevance *
      factors.gapMagnitude *
      factors.urgency;

    // Denominator: Effort and cost
    const costFactor = Math.max(1, Math.log2(factors.costEstimateUsd + 2));
    const denominator = factors.effort * costFactor;

    // Max theoretical raw score ~ (1.0 * 5 * 5 * 5 * 5) / (1 * 1) = 625
    const rawRatio = numerator / (denominator * 6.25);
    const score = Number(Math.min(100, Math.max(1, rawRatio)).toFixed(1));

    const reasonBreakdown = {
      confidence: `${(factors.confidence * 100).toFixed(0)}% verified from ground facts`,
      impact: `${factors.impact}/5 customer impact`,
      relevance: `${factors.relevance}/5 local business fit`,
      urgency: `${factors.urgency}/5 time sensitivity`,
      effort: `${factors.effort}/5 estimated operational effort`,
      cost: `$${factors.costEstimateUsd.toFixed(2)} estimated execution cost`,
      metricLabel: 'Internal Priority Score (not probability of ranking success)'
    };

    return { score, reasonBreakdown };
  }

  /**
   * Evaluates hard gate checks (consent, platform capability, evidence freshness, cooldown).
   */
  static evaluateHardGates(params: {
    hasConsent: boolean;
    isCapabilitySupported: boolean;
    isEvidenceValidAndActive: boolean;
    isUnderCooldown: boolean;
  }): HardGateCheck {
    if (!params.hasConsent) {
      return {
        ...params,
        passedAllGates: false,
        gateFailureReason: 'Location publishing consent is revoked or pending.'
      };
    }

    if (!params.isCapabilitySupported) {
      return {
        ...params,
        passedAllGates: false,
        gateFailureReason: 'External platform capability is not connected or unsupported.'
      };
    }

    if (!params.isEvidenceValidAndActive) {
      return {
        ...params,
        passedAllGates: false,
        gateFailureReason: 'Supporting evidence is expired or purged. Re-collection required.'
      };
    }

    if (params.isUnderCooldown) {
      return {
        ...params,
        passedAllGates: false,
        gateFailureReason: 'Recommendation is in active cooldown window to prevent repetitive fatigue.'
      };
    }

    return {
      ...params,
      passedAllGates: true
    };
  }

  /**
   * Produces a small weekly shortlist of actionable recommendations.
   * Gated items are excluded; duplicates are removed; approvals are strictly preserved.
   */
  static buildWeeklyShortlist(
    candidates: Array<{
      organizationId: string;
      locationId: string;
      title: string;
      targetAction: string;
      factors: HeuristicFactors;
      hardGates: HardGateCheck;
    }>,
    limit = 5
  ): PrioritizedRecommendation[] {
    const scoredList: PrioritizedRecommendation[] = candidates
      .filter((c) => c.hardGates.passedAllGates) // Hard gate filter!
      .map((c) => {
        const { score, reasonBreakdown } = this.computePriorityScore(c.factors);
        return {
          id: randomUUID(),
          organizationId: c.organizationId,
          locationId: c.locationId,
          recommendationTitle: c.title,
          targetAction: c.targetAction,
          internalPriorityScore: score,
          factors: c.factors,
          reasonBreakdown,
          hardGates: c.hardGates,
          requiresOwnerApproval: true, // High score strictly requires owner approval!
          createdAt: new Date().toISOString()
        };
      });

    // De-duplicate by targetAction
    const seenActions = new Set<string>();
    const deduped: PrioritizedRecommendation[] = [];

    for (const rec of scoredList.sort((a, b) => b.internalPriorityScore - a.internalPriorityScore)) {
      if (!seenActions.has(rec.targetAction)) {
        seenActions.add(rec.targetAction);
        deduped.push(rec);
      }
    }

    return deduped.slice(0, limit);
  }
}
