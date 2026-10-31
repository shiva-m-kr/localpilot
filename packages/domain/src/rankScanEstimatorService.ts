import { randomUUID } from 'crypto';
import {
  ScanFrequency,
  ProviderScanMode,
  ScanEstimate,
  ScanScheduleCommand,
  RankGridConfig
} from '@localpilot/contracts';
import { BudgetService } from './budgetService.js';
import { QuotaExceededError, ValidationFailedError } from './errors.js';

export class RankScanEstimatorService {
  private static readonly EFFECTIVE_PRICE_DATE = '2026-10-01T00:00:00.000Z';
  private static readonly BASE_TASK_MICROS = 2000; // $0.002 per task
  private static scheduledCommands = new Map<string, ScanScheduleCommand>();
  private static idempotencyMap = new Map<string, ScanScheduleCommand>();

  static reset(): void {
    this.scheduledCommands.clear();
    this.idempotencyMap.clear();
  }

  /**
   * Calculates detailed scan estimates with mode, depth, and frequency multipliers.
   */
  static calculateEstimate(params: {
    organizationId: string;
    config: RankGridConfig;
    frequency: ScanFrequency;
    mode: ProviderScanMode;
  }): ScanEstimate {
    const keywordsCount = params.config.keywords.length;
    const pointsCount = params.config.geometry.totalPoints;
    const tasksPerRun = keywordsCount * pointsCount;

    let runsPerMonth = 1;
    switch (params.frequency) {
      case 'ONCE':
        runsPerMonth = 1;
        break;
      case 'FOUR_TIMES_MONTHLY':
        runsPerMonth = 4;
        break;
      case 'TRUE_WEEKLY':
        runsPerMonth = 52 / 12; // 4.333
        break;
      case 'DAILY':
        runsPerMonth = 30;
        break;
    }

    const totalTasksPerMonth = Math.ceil(tasksPerRun * runsPerMonth);

    // Multipliers
    const depthMultiplier = params.config.depth > 50 ? 1.25 : 1.0;
    const modeMultiplier = params.mode === 'PRIORITY_LIVE' ? 1.5 : 1.0;

    const costPerTaskMicros = Math.round(
      this.BASE_TASK_MICROS * depthMultiplier * modeMultiplier
    );
    const totalCostMicros = totalTasksPerMonth * costPerTaskMicros;
    const estimatedMonthlyCostUsd = Number((totalCostMicros / 1_000_000).toFixed(4));

    // Credit requirement: 1 credit per 10 ranking tasks
    const requiredCredits = Math.ceil(totalTasksPerMonth / 10);
    const balance = BudgetService.getBalance(params.organizationId);
    const canAfford = balance.availableCredits >= requiredCredits;

    return {
      keywordsCount,
      pointsCount,
      frequency: params.frequency,
      mode: params.mode,
      totalTasksPerRun: tasksPerRun,
      runsPerMonth,
      totalTasksPerMonth,
      baseCostPerTaskMicros: this.BASE_TASK_MICROS,
      depthMultiplier,
      modeMultiplier,
      estimatedMonthlyCostUsd,
      requiredCredits,
      availableCredits: balance.availableCredits,
      canAfford,
      effectivePriceDate: this.EFFECTIVE_PRICE_DATE
    };
  }

  /**
   * Schedules a scan run, enforcing budget limits, plan boundaries, and double-click idempotency.
   */
  static scheduleScan(params: {
    organizationId: string;
    locationId: string;
    config: RankGridConfig;
    frequency: ScanFrequency;
    mode: ProviderScanMode;
    idempotencyKey: string;
    subscriptionTier?: 'STARTER' | 'GROWTH' | 'AGENCY';
  }): { command: ScanScheduleCommand; isDuplicate: boolean; estimate: ScanEstimate } {
    // 1. Double-click idempotency check
    const existing = this.idempotencyMap.get(params.idempotencyKey);
    if (existing) {
      const estimate = this.calculateEstimate({
        organizationId: params.organizationId,
        config: params.config,
        frequency: params.frequency,
        mode: params.mode
      });
      return { command: existing, isDuplicate: true, estimate };
    }

    // 2. Starter Tier Bounds Protection (prevents accidental runaway bill)
    const tier = params.subscriptionTier || 'STARTER';
    if (tier === 'STARTER') {
      if (params.frequency === 'DAILY') {
        throw new ValidationFailedError(
          'Daily grid tracking is restricted to Growth and Agency plans to protect against unexpected provider bills. Starter tier supports up to 4 scans per month.'
        );
      }
      if (params.config.geometry.gridSize === '7x7') {
        throw new ValidationFailedError(
          '7x7 (49-point) grids require a Growth or Agency tier subscription.'
        );
      }
    }

    // 3. Estimate & Budget Check
    const estimate = this.calculateEstimate({
      organizationId: params.organizationId,
      config: params.config,
      frequency: params.frequency,
      mode: params.mode
    });

    if (!estimate.canAfford) {
      throw new QuotaExceededError(
        'RANK_GRID_SCAN',
        estimate.requiredCredits,
        estimate.availableCredits,
        {
          frequency: params.frequency,
          monthlyCostUsd: estimate.estimatedMonthlyCostUsd,
          totalTasks: estimate.totalTasksPerMonth
        }
      );
    }

    // 4. Atomically reserve credits
    BudgetService.reserveCredits({
      organizationId: params.organizationId,
      provider: 'dataforseo',
      operation: 'RANK_GRID_SCAN',
      estimatedCredits: estimate.requiredCredits,
      estimatedCostMicros: Math.round(estimate.estimatedMonthlyCostUsd * 1_000_000),
      currency: 'USD',
      idempotencyKey: `res_${params.idempotencyKey}`
    });

    const command: ScanScheduleCommand = {
      id: randomUUID(),
      organizationId: params.organizationId,
      locationId: params.locationId,
      configId: params.config.configId,
      frequency: params.frequency,
      mode: params.mode,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString()
    };

    this.scheduledCommands.set(command.id, command);
    this.idempotencyMap.set(params.idempotencyKey, command);

    return { command, isDuplicate: false, estimate };
  }
}
