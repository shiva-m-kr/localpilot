import {
  PointObservation,
  VisibilityMetrics
} from '@localpilot/contracts';

export class RankVisibilityService {
  /**
   * Transparently calculates local visibility metrics with explicit denominators.
   * Excludes error points from denominator (does not count error points as rank 0 or 20).
   */
  static calculateMetrics(observations: PointObservation[], depth = 20): VisibilityMetrics {
    const totalGridPoints = observations.length;
    const errorPoints = observations.filter((o) => o.state === 'TASK_FAILED');
    const evaluablePoints = observations.filter((o) => o.state !== 'TASK_FAILED');

    const cappedDepthValue = depth + 1;

    // Zero evaluable points -> unavailable
    if (evaluablePoints.length === 0) {
      return {
        totalGridPoints,
        evaluablePointsCount: 0,
        errorPointsCount: errorPoints.length,
        foundPointsCount: 0,
        notFoundInDepthCount: 0,
        top3PointsCount: 0,
        top3CoveragePercent: null,
        top10CoveragePercent: null,
        averageFoundRank: null,
        labeledCappedAverageRank: null,
        cappedDepthValue,
        isUnavailable: true,
        denominatorFormulaText: `0 evaluable points (${totalGridPoints} grid points, all ${errorPoints.length} failed)`,
        explanation: 'Ranking observations are unavailable because all provider tasks encountered errors.'
      };
    }

    const foundPoints = evaluablePoints.filter((o) => o.state === 'FOUND' && o.rank !== null);
    const notFoundInDepthCount = evaluablePoints.filter((o) => o.state === 'NOT_FOUND_IN_DEPTH').length;
    const top3PointsCount = foundPoints.filter((o) => o.rank! <= 3).length;
    const top10PointsCount = foundPoints.filter((o) => o.rank! <= 10).length;

    const top3CoveragePercent = Number(
      ((top3PointsCount / evaluablePoints.length) * 100).toFixed(2)
    );
    const top10CoveragePercent = Number(
      ((top10PointsCount / evaluablePoints.length) * 100).toFixed(2)
    );

    // Found-only average
    const averageFoundRank =
      foundPoints.length > 0
        ? Number((foundPoints.reduce((sum, o) => sum + o.rank!, 0) / foundPoints.length).toFixed(2))
        : null;

    // Labeled Capped Average Rank: unranked evaluable points receive depth + 1 (e.g. 21)
    const cappedSum = evaluablePoints.reduce(
      (sum, o) => sum + (o.rank !== null ? o.rank : cappedDepthValue),
      0
    );
    const labeledCappedAverageRank = Number((cappedSum / evaluablePoints.length).toFixed(2));

    const denominatorFormulaText = `${evaluablePoints.length} evaluable points (${totalGridPoints} grid points - ${errorPoints.length} provider error points excluded)`;

    const explanation = `Top 3 coverage of ${top3CoveragePercent}% is calculated over ${evaluablePoints.length} verified points (${top3PointsCount} in Top 3, ${notFoundInDepthCount} unranked beyond depth ${depth}).`;

    return {
      totalGridPoints,
      evaluablePointsCount: evaluablePoints.length,
      errorPointsCount: errorPoints.length,
      foundPointsCount: foundPoints.length,
      notFoundInDepthCount,
      top3PointsCount,
      top3CoveragePercent,
      top10CoveragePercent,
      averageFoundRank,
      labeledCappedAverageRank,
      cappedDepthValue,
      isUnavailable: false,
      denominatorFormulaText,
      explanation
    };
  }
}
