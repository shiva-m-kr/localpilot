import { randomUUID } from 'crypto';
import {
  ActionPlan,
  ActionPlanStep,
  ActionPlanStatus
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export class ActionPlanService {
  private static plans = new Map<string, ActionPlan>();
  private static suppressions = new Map<string, string>(); // `locationId:actionType` -> expiresAtIso

  static reset(): void {
    this.plans.clear();
    this.suppressions.clear();
  }

  /**
   * Checks whether an action type is currently suppressed (snoozed or rejected).
   */
  static isActionSuppressed(
    locationId: string,
    actionType: string,
    asOfDateIso = new Date().toISOString()
  ): boolean {
    const key = `${locationId}:${actionType}`;
    const expiresAt = this.suppressions.get(key);
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() > new Date(asOfDateIso).getTime();
  }

  /**
   * Creates a structured action plan with ordered step dependencies.
   */
  static createPlan(params: {
    recommendationId: string;
    actionType: string;
    organizationId: string;
    locationId: string;
    title: string;
    steps: Array<{ id?: string; title: string; dependsOnStepIds?: string[] }>;
    estimatedCostUsd?: number;
  }): ActionPlan {
    const planId = randomUUID();
    const nowIso = new Date().toISOString();

    const planSteps: ActionPlanStep[] = params.steps.map((s) => ({
      stepId: s.id || randomUUID(),
      title: s.title,
      dependsOnStepIds: s.dependsOnStepIds || [],
      isPrerequisiteMet: (s.dependsOnStepIds || []).length === 0,
      isExecuted: false
    }));

    const plan: ActionPlan = {
      planId,
      recommendationId: params.recommendationId,
      actionType: params.actionType,
      organizationId: params.organizationId,
      locationId: params.locationId,
      title: params.title,
      status: 'READY_FOR_APPROVAL',
      steps: planSteps,
      estimatedCostUsd: params.estimatedCostUsd || 0,
      actualCostUsd: 0,
      technicalExecutionSuccess: false,
      marketingImpactAssessed: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.plans.set(planId, plan);
    return plan;
  }

  /**
   * Approves an action plan for execution.
   */
  static approvePlan(planId: string): ActionPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    const updated: ActionPlan = {
      ...plan,
      status: 'APPROVED',
      updatedAt: new Date().toISOString()
    };

    this.plans.set(planId, updated);
    return updated;
  }

  /**
   * Executes a step, strictly enforcing dependency order.
   */
  static async executeStep(
    planId: string,
    stepId: string,
    executeFn: () => Promise<{ externalId?: string; proof: string }>
  ): Promise<ActionPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    if (plan.status !== 'APPROVED' && plan.status !== 'IN_PROGRESS') {
      throw new ValidationFailedError(`Plan must be APPROVED before executing steps (current: ${plan.status}).`);
    }

    const stepIndex = plan.steps.findIndex((s) => s.stepId === stepId);
    if (stepIndex === -1) throw new ValidationFailedError(`Step ${stepId} not found in plan.`);

    const targetStep = plan.steps[stepIndex];

    // Check prerequisites: all prerequisite steps must be executed
    for (const prereqId of targetStep.dependsOnStepIds) {
      const prereqStep = plan.steps.find((s) => s.stepId === prereqId);
      if (!prereqStep || !prereqStep.isExecuted) {
        throw new ValidationFailedError(
          `Prerequisite blocked: Step "${prereqStep?.title || prereqId}" must be completed before executing "${targetStep.title}".`
        );
      }
    }

    // Execute step
    const result = await executeFn();
    const nowIso = new Date().toISOString();

    const updatedSteps = [...plan.steps];
    updatedSteps[stepIndex] = {
      ...targetStep,
      isExecuted: true,
      executedAt: nowIso,
      externalId: result.externalId,
      verificationProof: result.proof
    };

    // Update prerequisite met status on downstream steps
    for (let i = 0; i < updatedSteps.length; i++) {
      const s = updatedSteps[i];
      if (!s.isExecuted && s.dependsOnStepIds.length > 0) {
        const allMet = s.dependsOnStepIds.every((depId) => {
          const dep = updatedSteps.find((x) => x.stepId === depId);
          return dep && dep.isExecuted;
        });
        updatedSteps[i] = { ...s, isPrerequisiteMet: allMet };
      }
    }

    const allCompleted = updatedSteps.every((s) => s.isExecuted);
    const updatedPlan: ActionPlan = {
      ...plan,
      steps: updatedSteps,
      status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      technicalExecutionSuccess: allCompleted, // Technical write verified!
      marketingImpactAssessed: false, // Marketing outcome remains separate from execution
      updatedAt: nowIso
    };

    this.plans.set(planId, updatedPlan);
    return updatedPlan;
  }

  /**
   * Snoozes an action plan and sets a cooldown suppression.
   */
  static snoozePlan(planId: string, snoozeDays = 14): ActionPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    const now = new Date();
    const snoozedUntil = new Date(now.getTime() + snoozeDays * 24 * 60 * 60 * 1000).toISOString();

    const updated: ActionPlan = {
      ...plan,
      status: 'SNOOZED',
      snoozedUntil,
      updatedAt: now.toISOString()
    };

    this.plans.set(planId, updated);
    this.suppressions.set(`${plan.locationId}:${plan.actionType}`, snoozedUntil);
    return updated;
  }

  /**
   * Rejects an action plan and suppresses identical recommendations during cooldown.
   */
  static rejectPlan(planId: string, reason: string, cooldownDays = 30): ActionPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    const now = new Date();
    const cooldownExpires = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000).toISOString();

    const updated: ActionPlan = {
      ...plan,
      status: 'REJECTED',
      rejectionReason: reason,
      updatedAt: now.toISOString()
    };

    this.plans.set(planId, updated);
    this.suppressions.set(`${plan.locationId}:${plan.actionType}`, cooldownExpires);
    return updated;
  }
}
