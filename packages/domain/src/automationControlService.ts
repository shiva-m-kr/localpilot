import { randomUUID } from 'crypto';
import {
  AutomationPolicy,
  KillSwitchScope,
  PolicyImpactPreview
} from '@localpilot/contracts';
import { ApprovalRequiredError, ValidationFailedError } from './errors.js';

export interface ScheduledJobDescriptor {
  id: string;
  locationId: string;
  channel: 'WORDPRESS' | 'GBP' | 'META_FACEBOOK' | 'META_INSTAGRAM' | 'AI_GENERATION';
  scheduledAt: string;
  estimatedCostUsd: number;
}

export class AutomationControlService {
  private static policies = new Map<string, AutomationPolicy>();

  static reset(): void {
    this.policies.clear();
  }

  /**
   * Initializes or returns default review-first automation policy for a location.
   */
  static getOrCreatePolicy(organizationId: string, locationId: string): AutomationPolicy {
    const existing = this.policies.get(locationId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const policy: AutomationPolicy = {
      id: randomUUID(),
      organizationId,
      locationId,
      autoDraftingEnabled: true,
      autoSchedulingEnabled: true,
      autoPublishRequiresApproval: true, // Review-first default!
      dailySpendCapUsd: 10.0,
      monthlySpendCapUsd: 150.0,
      currentMonthSpentUsd: 0,
      upcomingScheduledCostUsd: 0,
      ownerEditWindowMinutes: 60,
      globalKillSwitchEngaged: false,
      activeKillSwitches: [],
      createdAt: now,
      updatedAt: now
    };

    this.policies.set(locationId, policy);
    return policy;
  }

  /**
   * Engages a kill switch (immediately halts automated dispatches in scope).
   */
  static engageKillSwitch(locationId: string, scope: KillSwitchScope): AutomationPolicy {
    const policy = this.policies.get(locationId);
    if (!policy) {
      throw new ValidationFailedError(`Policy for location ${locationId} not found.`);
    }

    let updated: AutomationPolicy;
    if (scope === 'GLOBAL_ALL') {
      updated = {
        ...policy,
        globalKillSwitchEngaged: true,
        updatedAt: new Date().toISOString()
      };
    } else {
      const switches = new Set(policy.activeKillSwitches);
      switches.add(scope);
      updated = {
        ...policy,
        activeKillSwitches: Array.from(switches),
        updatedAt: new Date().toISOString()
      };
    }

    this.policies.set(locationId, updated);
    return updated;
  }

  /**
   * Disengages a kill switch.
   */
  static disengageKillSwitch(locationId: string, scope: KillSwitchScope): AutomationPolicy {
    const policy = this.policies.get(locationId);
    if (!policy) {
      throw new ValidationFailedError(`Policy for location ${locationId} not found.`);
    }

    let updated: AutomationPolicy;
    if (scope === 'GLOBAL_ALL') {
      updated = {
        ...policy,
        globalKillSwitchEngaged: false,
        updatedAt: new Date().toISOString()
      };
    } else {
      updated = {
        ...policy,
        activeKillSwitches: policy.activeKillSwitches.filter((s) => s !== scope),
        updatedAt: new Date().toISOString()
      };
    }

    this.policies.set(locationId, updated);
    return updated;
  }

  /**
   * Safe Plan Upgrade: Adjusts monetary limits without broadening consent or disabling approval requirements.
   */
  static upgradePlan(
    locationId: string,
    newCaps: { dailySpendCapUsd: number; monthlySpendCapUsd: number }
  ): AutomationPolicy {
    const policy = this.policies.get(locationId);
    if (!policy) {
      throw new ValidationFailedError(`Policy for location ${locationId} not found.`);
    }

    // Preserve all consent and approval restrictions!
    const updated: AutomationPolicy = {
      ...policy,
      dailySpendCapUsd: newCaps.dailySpendCapUsd,
      monthlySpendCapUsd: newCaps.monthlySpendCapUsd,
      autoPublishRequiresApproval: policy.autoPublishRequiresApproval, // NEVER silently toggle approval requirement
      updatedAt: new Date().toISOString()
    };

    this.policies.set(locationId, updated);
    return updated;
  }

  /**
   * Previews the impact of a policy change or kill switch engagement on queued jobs.
   */
  static previewImpact(
    policy: AutomationPolicy,
    scopeToBlock: KillSwitchScope,
    scheduledJobs: ScheduledJobDescriptor[]
  ): PolicyImpactPreview {
    const locationJobs = scheduledJobs.filter((j) => j.locationId === policy.locationId);

    let impacted: ScheduledJobDescriptor[];
    if (scopeToBlock === 'GLOBAL_ALL') {
      impacted = locationJobs;
    } else {
      impacted = locationJobs.filter((j) => j.channel === scopeToBlock);
    }

    const upcomingSavingsUsd = impacted.reduce((sum, j) => sum + j.estimatedCostUsd, 0);
    const affectedChannels = Array.from(new Set(impacted.map((j) => j.channel)));

    return {
      affectedScheduledJobIds: impacted.map((j) => j.id),
      affectedChannels,
      upcomingSavingsUsd,
      summary: `Engaging ${scopeToBlock} immediately blocks ${impacted.length} scheduled dispatches across ${affectedChannels.join(', ') || '0 channels'}, holding $${upcomingSavingsUsd.toFixed(2)} in reserved budget.`
    };
  }

  /**
   * Evaluates if a queued job dispatch is permitted right now.
   * Immediately rejects if kill switch is active or budget exceeded.
   */
  static isDispatchPermitted(
    locationId: string,
    channel: 'WORDPRESS' | 'GBP' | 'META_FACEBOOK' | 'META_INSTAGRAM' | 'AI_GENERATION',
    isApprovedByOwner: boolean
  ): { permitted: boolean; reason?: string } {
    const policy = this.policies.get(locationId);
    if (!policy) {
      return { permitted: false, reason: 'No automation policy found for location.' };
    }

    // 1. Global Kill Switch
    if (policy.globalKillSwitchEngaged) {
      return { permitted: false, reason: 'Global automation kill switch is engaged. All dispatches halted.' };
    }

    // 2. Channel Kill Switch
    if (policy.activeKillSwitches.includes(channel as KillSwitchScope)) {
      return { permitted: false, reason: `Channel kill switch is engaged for ${channel}. Dispatch halted.` };
    }

    // 3. Approval Requirement
    if (policy.autoPublishRequiresApproval && !isApprovedByOwner) {
      return { permitted: false, reason: 'Policy mandates owner approval before publication.' };
    }

    // 4. Monthly Cap Guard
    if (policy.currentMonthSpentUsd >= policy.monthlySpendCapUsd) {
      return { permitted: false, reason: `Monthly spend cap ($${policy.monthlySpendCapUsd}) reached.` };
    }

    return { permitted: true };
  }
}
