import { z } from 'zod';

export const CurrencyCodeSchema = z.enum(['INR', 'USD', 'EUR', 'GBP']);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * Monetary value stored strictly in integer minor units (e.g. Paise for INR, Cents for USD).
 * Prevents floating-point precision loss.
 */
export const MoneySchema = z.object({
  amountMinor: z.number().int({ message: 'Amount in minor units must be an integer' }),
  currency: CurrencyCodeSchema
});

export type Money = z.infer<typeof MoneySchema>;

/**
 * Service credits contract for metered operations (SERP grid scans, AI tokens, citation submissions).
 */
export const ServiceCreditsSchema = z.object({
  availableCredits: z.number().int().nonnegative(),
  reservedCredits: z.number().int().nonnegative(),
  lifetimeSpentCredits: z.number().int().nonnegative()
});

export type ServiceCredits = z.infer<typeof ServiceCreditsSchema>;
