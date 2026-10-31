import crypto from 'crypto';
import {
  ReservationRecord,
  TenantBudgetBalance,
  CurrencyCode
} from '@localpilot/contracts';
import { QuotaExceededError, ValidationFailedError } from './errors.js';

export interface ReserveCreditsInput {
  organizationId: string;
  provider: string;
  operation: string;
  estimatedCredits: number;
  estimatedCostMicros: number;
  currency: CurrencyCode;
  idempotencyKey: string;
}

export class BudgetService {
  private static allowances = new Map<string, number>(); // orgId -> total credits allowance
  private static spent = new Map<string, number>(); // orgId -> spent credits
  private static reservations = new Map<string, ReservationRecord>(); // reservationId -> record
  private static keyToReservationId = new Map<string, string>(); // idempotencyKey -> reservationId

  static clear(): void {
    this.allowances.clear();
    this.spent.clear();
    this.reservations.clear();
    this.keyToReservationId.clear();
  }

  static setTenantAllowance(organizationId: string, allowanceCredits: number): void {
    this.allowances.set(organizationId, allowanceCredits);
    if (!this.spent.has(organizationId)) {
      this.spent.set(organizationId, 0);
    }
  }

  static getBalance(organizationId: string): TenantBudgetBalance {
    const totalAllowanceCredits = this.allowances.get(organizationId) || 0;
    const spentCredits = this.spent.get(organizationId) || 0;

    let reservedCredits = 0;
    for (const res of this.reservations.values()) {
      if (res.organizationId === organizationId && res.status === 'reserved') {
        reservedCredits += res.estimatedCredits;
      }
    }

    const availableCredits = Math.max(0, totalAllowanceCredits - spentCredits - reservedCredits);
    const hardCapReached = availableCredits === 0;

    return {
      organizationId,
      totalAllowanceCredits,
      spentCredits,
      reservedCredits,
      availableCredits,
      hardCapReached
    };
  }

  /**
   * Atomically reserves credits for an upcoming operation.
   * Enforces idempotency and throws QuotaExceededError if balance is insufficient.
   */
  static reserveCredits(input: ReserveCreditsInput): ReservationRecord {
    // 1. Idempotency Check
    const existingId = this.keyToReservationId.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.reservations.get(existingId);
      if (existing) {
        return existing;
      }
    }

    // 2. Atomic Balance Check
    const balance = this.getBalance(input.organizationId);
    if (balance.availableCredits < input.estimatedCredits) {
      throw new QuotaExceededError(
        input.operation,
        input.estimatedCredits,
        balance.availableCredits,
        {
          provider: input.provider,
          totalAllowance: balance.totalAllowanceCredits,
          spent: balance.spentCredits,
          reserved: balance.reservedCredits
        }
      );
    }

    // 3. Create Reservation Hold
    const id = crypto.randomUUID();
    const reservation: ReservationRecord = {
      id,
      organizationId: input.organizationId,
      provider: input.provider,
      operation: input.operation,
      estimatedCredits: input.estimatedCredits,
      estimatedCostMicros: input.estimatedCostMicros,
      currency: input.currency,
      status: 'reserved',
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString()
    };

    this.reservations.set(id, reservation);
    this.keyToReservationId.set(input.idempotencyKey, id);

    return reservation;
  }

  /**
   * Finalizes a reservation, moving the actual used credits to spent.
   * Repeated finalization calls do NOT double-charge (idempotent finalization).
   */
  static finalizeReservation(
    reservationId: string,
    actualCredits: number,
    actualCostMicros?: number
  ): ReservationRecord {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new ValidationFailedError(`Reservation ${reservationId} not found.`);
    }

    // Idempotent: If already finalized, return existing record without double-deduction
    if (reservation.status === 'finalized') {
      return reservation;
    }

    if (reservation.status === 'released') {
      throw new ValidationFailedError(`Cannot finalize previously released reservation ${reservationId}.`);
    }

    const currentSpent = this.spent.get(reservation.organizationId) || 0;
    this.spent.set(reservation.organizationId, currentSpent + actualCredits);

    reservation.status = 'finalized';
    reservation.actualCredits = actualCredits;
    reservation.actualCostMicros = actualCostMicros;
    reservation.finalizedAt = new Date().toISOString();

    return reservation;
  }

  /**
   * Releases a reservation when work fails, is cancelled, or is rejected.
   * Returns held credits back into available balance.
   */
  static releaseReservation(reservationId: string, reason?: string): ReservationRecord {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new ValidationFailedError(`Reservation ${reservationId} not found.`);
    }

    if (reservation.status === 'released') {
      return reservation;
    }

    if (reservation.status === 'finalized') {
      throw new ValidationFailedError(`Cannot release already finalized reservation ${reservationId}.`);
    }

    reservation.status = 'released';
    reservation.releasedAt = new Date().toISOString();

    return reservation;
  }

  static getReservation(reservationId: string): ReservationRecord | null {
    return this.reservations.get(reservationId) || null;
  }
}
