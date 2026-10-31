import { randomUUID } from 'crypto';
import {
  ScanRunExecution,
  RankGridConfig,
  VisibilityMetrics,
  RankComparisonDelta,
  RunComparisonEligibility
} from '@localpilot/contracts';

export class RankHistoryService {
  /**
   * Evaluates if two historical runs used identical sampling footprints.
   */
  static checkEligibility(
    configA: RankGridConfig,
    configB: RankGridConfig
  ): RunComparisonEligibility {
    if (configA.configHash !== configB.configHash) {
      return {
        isEligible: false,
        ineligibilityReason:
          'Sampling footprints differ (configuration hash mismatch). Comparisons require identical sampling geometry, device, keywords, and depth to prevent misleading charts.',
        baselineConfigHash: configA.configHash,
        candidateConfigHash: configB.configHash
      };
    }

    return {
      isEligible: true,
      baselineConfigHash: configA.configHash,
      candidateConfigHash: configB.configHash
    };
  }

  /**
   * Compares two compatible runs and investigates anomalies.
   * Does NOT declare Google penalties or trigger automatic mass page rewrites.
   */
  static compareRuns(params: {
    baselineRun: ScanRunExecution;
    baselineConfig: RankGridConfig;
    baselineMetrics: VisibilityMetrics;
    candidateRun: ScanRunExecution;
    candidateConfig: RankGridConfig;
    candidateMetrics: VisibilityMetrics;
  }): RankComparisonDelta {
    const eligibility = this.checkEligibility(params.baselineConfig, params.candidateConfig);
    const nowIso = new Date().toISOString();

    if (!eligibility.isEligible) {
      return {
        baselineRunId: params.baselineRun.runId,
        candidateRunId: params.candidateRun.runId,
        isEligible: false,
        ineligibilityReason: eligibility.ineligibilityReason,
        top3CoverageDeltaPercent: null,
        averageFoundRankDelta: null,
        isAnomaly: false,
        anomalySeverity: 'NORMAL',
        comparedAt: nowIso
      };
    }

    // Minimum coverage requirement: 80% evaluable points
    const baselineCoverageRatio =
      params.baselineMetrics.evaluablePointsCount / params.baselineMetrics.totalGridPoints;
    const candidateCoverageRatio =
      params.candidateMetrics.evaluablePointsCount / params.candidateMetrics.totalGridPoints;

    if (baselineCoverageRatio < 0.8 || candidateCoverageRatio < 0.8) {
      return {
        baselineRunId: params.baselineRun.runId,
        candidateRunId: params.candidateRun.runId,
        isEligible: true,
        top3CoverageDeltaPercent: null,
        averageFoundRankDelta: null,
        isAnomaly: false,
        anomalySeverity: 'NORMAL',
        anomalyExplanation:
          'Comparison suspended: One or both runs have less than 80% verified provider points due to task failures.',
        comparedAt: nowIso
      };
    }

    const baselineTop3 = params.baselineMetrics.top3CoveragePercent || 0;
    const candidateTop3 = params.candidateMetrics.top3CoveragePercent || 0;
    const coverageDelta = Number((candidateTop3 - baselineTop3).toFixed(2));

    let avgRankDelta: number | null = null;
    if (params.baselineMetrics.averageFoundRank && params.candidateMetrics.averageFoundRank) {
      avgRankDelta = Number(
        (params.candidateMetrics.averageFoundRank - params.baselineMetrics.averageFoundRank).toFixed(2)
      );
    }

    // Anomaly logic: > 25% drop in top 3 coverage
    let isAnomaly = false;
    let anomalySeverity: RankComparisonDelta['anomalySeverity'] = 'NORMAL';
    let anomalyExplanation: string | undefined;
    let investigativeEvidenceTaskId: string | undefined;

    if (coverageDelta <= -25 || (avgRankDelta !== null && avgRankDelta >= 4.0)) {
      isAnomaly = true;
      anomalySeverity = 'SIGNIFICANT_DROP';
      investigativeEvidenceTaskId = randomUUID();
      anomalyExplanation =
        `Observed significant decline of ${Math.abs(coverageDelta)}% in Top-3 coverage. Created bounded evidence task #${investigativeEvidenceTaskId.slice(0, 8)} to collect fresh SERP snapshots. Truth-in-SEO: No automated page rewrites or speculative algorithm penalty claims made.`;
    } else if (coverageDelta >= 25 || (avgRankDelta !== null && avgRankDelta <= -4.0)) {
      isAnomaly = true;
      anomalySeverity = 'SIGNIFICANT_SURGE';
      anomalyExplanation = `Observed notable surge of +${coverageDelta}% in Top-3 coverage under identical sampling footprint.`;
    }

    return {
      baselineRunId: params.baselineRun.runId,
      candidateRunId: params.candidateRun.runId,
      isEligible: true,
      top3CoverageDeltaPercent: coverageDelta,
      averageFoundRankDelta: avgRankDelta,
      isAnomaly,
      anomalySeverity,
      anomalyExplanation,
      investigativeEvidenceTaskId,
      comparedAt: nowIso
    };
  }
}
