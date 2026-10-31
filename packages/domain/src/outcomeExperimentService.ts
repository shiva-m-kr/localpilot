import { randomUUID } from 'crypto';
import {
  OutcomeExperiment,
  ExperimentStatus,
  ConfounderItem
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class OutcomeExperimentService {
  private static experiments = new Map<string, OutcomeExperiment>();

  private static readonly CAUSATION_DISCLAIMER =
    'Local search visibility and customer inquiries are subject to multi-variable market forces (seasonality, competitor actions, and algorithm shifts). Observations are analyzed for correlation without asserting proven direct causation.';

  static reset(): void {
    this.experiments.clear();
  }

  /**
   * Initializes a conservative outcome observation experiment following an action plan execution.
   */
  static createExperiment(params: {
    organizationId: string;
    locationId: string;
    actionPlanId: string;
    hypothesis: string;
    interventionDate: string;
    baselineValue: number;
    baselineStartDate: string;
    baselineEndDate: string;
    confounders?: ConfounderItem[];
  }): OutcomeExperiment {
    const id = randomUUID();
    const interventionTime = new Date(params.interventionDate).getTime();
    const minDays = 28;
    const observationEndTime = new Date(interventionTime + minDays * 24 * 60 * 60 * 1000).toISOString();

    const nowIso = new Date().toISOString();
    const experiment: OutcomeExperiment = {
      id,
      organizationId: params.organizationId,
      locationId: params.locationId,
      actionPlanId: params.actionPlanId,
      hypothesis: params.hypothesis,
      interventionDate: params.interventionDate,
      baselineWindow: {
        startDate: params.baselineStartDate,
        endDate: params.baselineEndDate,
        observedValue: params.baselineValue
      },
      observationWindow: {
        startDate: params.interventionDate,
        endDate: observationEndTime,
        observedValue: null
      },
      minRequiredObservationDays: minDays,
      status: 'OBSERVATION_ACTIVE',
      confounders: params.confounders || [],
      causationDisclaimer: this.CAUSATION_DISCLAIMER,
      isPrematureToChange: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.experiments.set(id, experiment);
    return experiment;
  }

  /**
   * Checks whether it is premature to recommend modifications while an observation window is active.
   */
  static isPrematureToModify(locationId: string, asOfDateIso = new Date().toISOString()): boolean {
    const asOfTime = new Date(asOfDateIso).getTime();
    for (const exp of this.experiments.values()) {
      if (exp.locationId === locationId && exp.status === 'OBSERVATION_ACTIVE') {
        const endTime = new Date(exp.observationWindow.endDate).getTime();
        if (asOfTime < endTime) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Evaluates the conclusion of an experiment once the observation window concludes.
   * Discloses confounders and never labels inconclusive data as "proven lift".
   */
  static evaluateConclusion(params: {
    experimentId: string;
    observedValue: number;
    asOfDateIso: string;
    additionalConfounders?: ConfounderItem[];
  }): OutcomeExperiment {
    const exp = this.experiments.get(params.experimentId);
    if (!exp) throw new ValidationFailedError(`Experiment ${params.experimentId} not found.`);

    const asOfTime = new Date(params.asOfDateIso).getTime();
    const endTime = new Date(exp.observationWindow.endDate).getTime();

    // 1. Premature check: Cannot conclude while window is active
    if (asOfTime < endTime) {
      throw new ValidationFailedError(
        `Cannot conclude experiment prematurely. Observation window requires ${exp.minRequiredObservationDays} days (active until ${exp.observationWindow.endDate}).`
      );
    }

    const allConfounders = [...exp.confounders, ...(params.additionalConfounders || [])];
    const baseline = exp.baselineWindow.observedValue ?? 0;
    const observed = params.observedValue;

    let status: ExperimentStatus = 'CONCLUDED_NO_CHANGE';
    let conclusionNotes: string;

    // Small sample size or active confounders force inconclusive outcome
    if (allConfounders.length > 0 || observed < 10) {
      status = 'CONCLUDED_INCONCLUSIVE';
      conclusionNotes = `Inconclusive outcome: Observed value was ${observed} vs baseline ${baseline}. Identified confounders (${allConfounders.map((c) => c.type).join(', ')}) and small sample size prevent attributing outcome to the intervention.`;
    } else if (observed > baseline) {
      status = 'CONCLUDED_CORRELATED_LIFT';
      conclusionNotes = `Correlated lift observed (+${(observed - baseline).toFixed(1)}). Results recorded as correlated performance without claiming proven causal attribution.`;
    } else if (observed < baseline) {
      status = 'CONCLUDED_CORRELATED_DROP';
      conclusionNotes = `Correlated drop observed (${(observed - baseline).toFixed(1)}). Recommending review of customer journey friction.`;
    } else {
      conclusionNotes = 'No measurable change observed between baseline and observation periods.';
    }

    const updated: OutcomeExperiment = {
      ...exp,
      observationWindow: {
        ...exp.observationWindow,
        observedValue: observed
      },
      status,
      confounders: allConfounders,
      isPrematureToChange: false,
      conclusionNotes,
      updatedAt: new Date().toISOString()
    };

    this.experiments.set(params.experimentId, updated);
    return updated;
  }
}
