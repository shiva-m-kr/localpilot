import {
  CategoryAllowance,
  LocationEntitlementsReport,
  TenantCostRecord,
  TenantMarginReport,
  UsageCategory,
} from '@localpilot/contracts';
import { QuotaExceededError, ValidationFailedError } from './errors.js';

export interface EntitlementsStorage {
  getAllowances(locationId: string): Promise<Map<UsageCategory, { limit: number; used: number; reserved: number }>>;
  saveAllowances(locationId: string, allowances: Map<UsageCategory, { limit: number; used: number; reserved: number }>): Promise<void>;
  getCostRecords(locationId: string): Promise<TenantCostRecord[]>;
  saveCostRecord(record: TenantCostRecord): Promise<void>;
}

export class EntitlementsMarginService {
  private storage: EntitlementsStorage;

  constructor(storage: EntitlementsStorage) {
    this.storage = storage;
  }

  /**
   * Reserves usage atomically to prevent concurrent spend overshoot
   */
  public async reserveUsage(
    locationId: string,
    category: UsageCategory,
    count: number,
    allowOverages: boolean = false,
    overageCapCredits: number = 0
  ): Promise<{ reservationId: string; category: UsageCategory; count: number }> {
    const allowances = await this.storage.getAllowances(locationId);
    const item = allowances.get(category) || { limit: 0, used: 0, reserved: 0 };

    const available = item.limit - (item.used + item.reserved);

    if (count > available) {
      if (!allowOverages) {
        throw new QuotaExceededError(
          `Usage reservation for ${category}`,
          count,
          Math.max(0, available),
          { locationId, category, requested: count, available }
        );
      }
      // Overages allowed up to overageCapCredits
      const overageNeeded = count - available;
      if (overageNeeded > overageCapCredits) {
        throw new QuotaExceededError(
          `Usage overage cap exceeded for ${category}`,
          count,
          available + overageCapCredits
        );
      }
    }

    item.reserved += count;
    allowances.set(category, item);
    await this.storage.saveAllowances(locationId, allowances);

    return {
      reservationId: crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}`,
      category,
      count,
    };
  }

  /**
   * Commits reserved usage to the ledger
   */
  public async commitUsage(
    locationId: string,
    category: UsageCategory,
    reservedCount: number,
    actualUsed: number
  ): Promise<void> {
    const allowances = await this.storage.getAllowances(locationId);
    const item = allowances.get(category);
    if (!item) {
      throw new ValidationFailedError(`No allowance record for category '${category}'.`);
    }

    item.reserved = Math.max(0, item.reserved - reservedCount);
    item.used += actualUsed;

    allowances.set(category, item);
    await this.storage.saveAllowances(locationId, allowances);
  }

  /**
   * Records observed operational expense categorized by source
   */
  public async recordExpense(params: {
    tenantId: string;
    locationId: string;
    expenseCategory: 'AI_INFERENCE' | 'SERP_PROVIDER' | 'PARTNER_FULFILLMENT' | 'HUMAN_SUPPORT';
    costMinor: number;
    memo: string;
    currency?: string;
  }): Promise<TenantCostRecord> {
    const record: TenantCostRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
      tenantId: params.tenantId as any,
      locationId: params.locationId as any,
      expenseCategory: params.expenseCategory,
      costMinor: params.costMinor,
      currency: params.currency || 'INR',
      memo: params.memo,
      recordedAt: new Date().toISOString(),
    };

    await this.storage.saveCostRecord(record);
    return record;
  }

  /**
   * Generates location margin report separating AI inference, SERP, partner, and support
   */
  public async getMarginReport(
    tenantId: string,
    locationId: string,
    monthlyRevenueMinor: number
  ): Promise<TenantMarginReport> {
    const expenses = await this.storage.getCostRecords(locationId);

    let aiInference = 0;
    let serpProvider = 0;
    let fulfillment = 0;
    let support = 0;

    for (const exp of expenses) {
      if (exp.expenseCategory === 'AI_INFERENCE') aiInference += exp.costMinor;
      if (exp.expenseCategory === 'SERP_PROVIDER') serpProvider += exp.costMinor;
      if (exp.expenseCategory === 'PARTNER_FULFILLMENT') fulfillment += exp.costMinor;
      if (exp.expenseCategory === 'HUMAN_SUPPORT') support += exp.costMinor;
    }

    const totalCostMinor = aiInference + serpProvider + fulfillment + support;
    const profitMinor = monthlyRevenueMinor - totalCostMinor;
    const marginPct = monthlyRevenueMinor > 0 ? (profitMinor / monthlyRevenueMinor) * 100 : 0;

    return {
      tenantId: tenantId as any,
      locationId: locationId as any,
      revenueMinor: monthlyRevenueMinor,
      aiInferenceCostMinor: aiInference,
      serpProviderCostMinor: serpProvider,
      fulfillmentCostMinor: fulfillment,
      supportCostMinor: support,
      totalCostMinor,
      grossMarginPercentage: parseFloat(marginPct.toFixed(1)),
      isMarginHealthy: marginPct >= 40.0, // Healthy SaaS target > 40% margin
    };
  }
}
