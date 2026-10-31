import { Money, CurrencyCode } from '@localpilot/contracts';

export class MoneyService {
  static create(amountMinor: number, currency: CurrencyCode): Money {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(`Amount in minor units must be an integer: received ${amountMinor}`);
    }
    return { amountMinor, currency };
  }

  static add(a: Money, b: Money): Money {
    this.assertMatchingCurrency(a, b);
    return {
      amountMinor: a.amountMinor + b.amountMinor,
      currency: a.currency
    };
  }

  static subtract(a: Money, b: Money): Money {
    this.assertMatchingCurrency(a, b);
    return {
      amountMinor: a.amountMinor - b.amountMinor,
      currency: a.currency
    };
  }

  static multiply(money: Money, multiplier: number): Money {
    // Round to nearest integer minor unit
    const result = Math.round(money.amountMinor * multiplier);
    return {
      amountMinor: result,
      currency: money.currency
    };
  }

  static format(money: Money, locale: string = 'en-IN'): string {
    const majorAmount = money.amountMinor / 100;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency
    }).format(majorAmount);
  }

  private static assertMatchingCurrency(a: Money, b: Money): void {
    if (a.currency !== b.currency) {
      throw new Error(`Currency mismatch: Cannot operate on ${a.currency} and ${b.currency}`);
    }
  }
}
