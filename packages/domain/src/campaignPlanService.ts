import crypto from 'crypto';
import {
  MonthlyCampaignPlan,
  CampaignPlanItem,
  IntentCluster
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';

export interface GeneratePlanInput {
  organizationId: string;
  month: string; // YYYY-MM
  clusters: IntentCluster[];
  confirmedFacts: Record<string, unknown>;
  maxCreditBudget: number;
}

export class CampaignPlanService {
  private static plans = new Map<string, MonthlyCampaignPlan>(); // planId -> MonthlyCampaignPlan

  static clear(): void {
    this.plans.clear();
  }

  /**
   * Generates a grounded, high-impact 30-day campaign plan within budget.
   * Prioritizes fewer useful items over forced daily filler.
   */
  static generatePlan(input: GeneratePlanInput): MonthlyCampaignPlan {
    const items: CampaignPlanItem[] = [];
    let totalCredits = 0;

    // Pick top high-intent clusters (bounded at 4-6 key topics per month)
    const selectedClusters = input.clusters.slice(0, 4);

    for (const cluster of selectedClusters) {
      const creditsCost = 2; // 2 credits per multi-channel campaign item

      if (totalCredits + creditsCost > input.maxCreditBudget) {
        // Enforce quota limits: stop adding items if budget is exceeded!
        break;
      }

      const item: CampaignPlanItem = {
        id: crypto.randomUUID(),
        title: `${cluster.service} Seasonal Guide & Local Dispatch`,
        service: cluster.service,
        clusterId: cluster.id,
        channelMix: ['wordpress', 'google_business_profile'],
        businessGoal: `Capture local high-intent search for ${cluster.service} in ${cluster.targetLocality}`,
        sourceFacts: [
          `Confirmed Service: ${cluster.service}`,
          `Target Service Area: ${cluster.targetLocality}`
        ],
        neededOwnerEvidence: `Upload 1 verified photo of completed ${cluster.service} job`,
        prerequisites: [
          'Owner photo evidence required before publishing',
          'Review-first approval required'
        ],
        estimatedCredits: creditsCost,
        status: 'PROPOSED'
      };

      items.push(item);
      totalCredits += creditsCost;
    }

    const now = new Date().toISOString();
    const plan: MonthlyCampaignPlan = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      month: input.month,
      items,
      totalEstimatedCredits: totalCredits,
      isOwnerApproved: false,
      createdAt: now,
      updatedAt: now
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  static approvePlanItem(planId: string, itemId: string): CampaignPlanItem {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    const item = plan.items.find((i) => i.id === itemId);
    if (!item) throw new ValidationFailedError(`Item ${itemId} not found in plan.`);

    item.status = 'APPROVED';
    plan.updatedAt = new Date().toISOString();
    return item;
  }

  static removePlanItem(planId: string, itemId: string): void {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    const item = plan.items.find((i) => i.id === itemId);
    if (item) {
      item.status = 'REMOVED';
      plan.totalEstimatedCredits = Math.max(0, plan.totalEstimatedCredits - item.estimatedCredits);
      plan.updatedAt = new Date().toISOString();
    }
  }

  static editPlanItem(planId: string, itemId: string, updates: Partial<CampaignPlanItem>): CampaignPlanItem {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    const item = plan.items.find((i) => i.id === itemId);
    if (!item) throw new ValidationFailedError(`Item ${itemId} not found in plan.`);

    if (updates.title) item.title = updates.title;
    if (updates.businessGoal) item.businessGoal = updates.businessGoal;
    item.status = 'EDITED';
    plan.updatedAt = new Date().toISOString();

    return item;
  }

  static approveEntirePlan(planId: string): MonthlyCampaignPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new ValidationFailedError(`Plan ${planId} not found.`);

    plan.isOwnerApproved = true;
    for (const item of plan.items) {
      if (item.status === 'PROPOSED') {
        item.status = 'APPROVED';
      }
    }
    plan.updatedAt = new Date().toISOString();
    return plan;
  }

  static getPlan(planId: string): MonthlyCampaignPlan | null {
    return this.plans.get(planId) || null;
  }
}
