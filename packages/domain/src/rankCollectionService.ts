import { randomUUID } from 'crypto';
import {
  ScanRunExecution,
  PointObservation,
  CompetitorCandidate,
  RankGridConfig
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface ProviderPointTaskResult {
  taskId: string;
  isTaskError: boolean;
  errorMessage?: string;
  rank: number | null;
  found: boolean;
  competitors: Array<{
    placeId: string;
    businessName: string;
    rank: number;
    rating?: number;
    reviewCount?: number;
  }>;
}

export class RankCollectionService {
  private static runs = new Map<string, ScanRunExecution>();

  static reset(): void {
    this.runs.clear();
  }

  /**
   * Executes a reliable rank collection run across all grid points.
   * Handles per-point retries, task error isolation, and simultaneous competitor extraction.
   */
  static async executeScanRun(params: {
    config: RankGridConfig;
    keyword: string;
    fetchPointTaskFn: (pointIndex: number, lat: number, lng: number) => Promise<ProviderPointTaskResult>;
  }): Promise<ScanRunExecution> {
    const runId = randomUUID();
    const observations: PointObservation[] = [];
    const extractedCompetitors: CompetitorCandidate[] = [];
    const taskIds: string[] = [];

    const nowIso = new Date().toISOString();

    for (const pt of params.config.points) {
      let retryCount = 0;
      let lastResult: ProviderPointTaskResult | null = null;

      // Bounded retries: max 2 retries per point
      while (retryCount <= 2) {
        lastResult = await params.fetchPointTaskFn(pt.pointIndex, pt.latitude, pt.longitude);
        taskIds.push(lastResult.taskId);

        if (!lastResult.isTaskError) {
          break;
        }
        retryCount++;
      }

      if (lastResult!.isTaskError) {
        // Transport success with task failure does NOT become rank data!
        observations.push({
          pointIndex: pt.pointIndex,
          latitude: pt.latitude,
          longitude: pt.longitude,
          state: 'TASK_FAILED',
          rank: null,
          taskError: lastResult!.errorMessage || 'Provider internal task failed',
          taskId: lastResult!.taskId,
          retryCount
        });
      } else if (lastResult!.found && lastResult!.rank !== null) {
        observations.push({
          pointIndex: pt.pointIndex,
          latitude: pt.latitude,
          longitude: pt.longitude,
          state: 'FOUND',
          rank: lastResult!.rank,
          matchedPlaceId: params.config.target.placeId,
          taskId: lastResult!.taskId,
          retryCount
        });
      } else {
        observations.push({
          pointIndex: pt.pointIndex,
          latitude: pt.latitude,
          longitude: pt.longitude,
          state: 'NOT_FOUND_IN_DEPTH',
          rank: null,
          taskId: lastResult!.taskId,
          retryCount
        });
      }

      // Simultaneously extract competitors from the same result sample
      if (lastResult && lastResult.competitors) {
        for (const comp of lastResult.competitors) {
          if (comp.placeId !== params.config.target.placeId) {
            extractedCompetitors.push({
              placeId: comp.placeId,
              businessName: comp.businessName,
              rank: comp.rank,
              rating: comp.rating,
              reviewCount: comp.reviewCount,
              observedAtPointIndex: pt.pointIndex
            });
          }
        }
      }
    }

    const failedPoints = observations.filter((o) => o.state === 'TASK_FAILED').length;
    const successfulPoints = observations.filter((o) => o.state === 'FOUND').length;
    const notFoundPoints = observations.filter((o) => o.state === 'NOT_FOUND_IN_DEPTH').length;

    let status: ScanRunExecution['status'] = 'COMPLETED_SUCCESS';
    if (failedPoints === params.config.points.length) {
      status = 'FAILED';
    } else if (failedPoints > 0) {
      status = 'PARTIAL_FAILURE'; // Recoverable!
    }

    const run: ScanRunExecution = {
      runId,
      configId: params.config.configId,
      locationId: params.config.locationId,
      organizationId: params.config.organizationId,
      keyword: params.keyword,
      status,
      totalPoints: params.config.points.length,
      successfulPoints,
      failedPoints,
      notFoundPoints,
      observations,
      extractedCompetitors,
      taskIds,
      startedAt: nowIso,
      completedAt: new Date().toISOString()
    };

    this.runs.set(runId, run);
    return run;
  }

  /**
   * Recovers a partial run by re-running only the failed points.
   */
  static async resumePartialRun(
    runId: string,
    fetchPointTaskFn: (pointIndex: number, lat: number, lng: number) => Promise<ProviderPointTaskResult>
  ): Promise<ScanRunExecution> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new ValidationFailedError(`Scan run ${runId} not found.`);
    }

    const updatedObservations = [...run.observations];

    for (let i = 0; i < updatedObservations.length; i++) {
      const obs = updatedObservations[i];
      if (obs.state === 'TASK_FAILED') {
        const retryResult = await fetchPointTaskFn(obs.pointIndex, obs.latitude, obs.longitude);
        if (!retryResult.isTaskError) {
          if (retryResult.found && retryResult.rank !== null) {
            updatedObservations[i] = {
              ...obs,
              state: 'FOUND',
              rank: retryResult.rank,
              taskError: undefined,
              taskId: retryResult.taskId,
              retryCount: obs.retryCount + 1
            };
          } else {
            updatedObservations[i] = {
              ...obs,
              state: 'NOT_FOUND_IN_DEPTH',
              rank: null,
              taskError: undefined,
              taskId: retryResult.taskId,
              retryCount: obs.retryCount + 1
            };
          }
        }
      }
    }

    const failedPoints = updatedObservations.filter((o) => o.state === 'TASK_FAILED').length;
    const successfulPoints = updatedObservations.filter((o) => o.state === 'FOUND').length;
    const notFoundPoints = updatedObservations.filter((o) => o.state === 'NOT_FOUND_IN_DEPTH').length;

    const updatedRun: ScanRunExecution = {
      ...run,
      status: failedPoints === 0 ? 'COMPLETED_SUCCESS' : 'PARTIAL_FAILURE',
      failedPoints,
      successfulPoints,
      notFoundPoints,
      observations: updatedObservations,
      completedAt: new Date().toISOString()
    };

    this.runs.set(runId, updatedRun);
    return updatedRun;
  }
}
