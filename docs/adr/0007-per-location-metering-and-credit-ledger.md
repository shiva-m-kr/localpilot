# ADR 007: Per-Location Metering, Quotas, and Atomic Credit Ledger

## Status
Accepted

## Context
Third-party APIs and AI generation incur real financial costs:
- SERP grid scans (e.g. 5x5 grid = 25 points; 7x7 grid = 49 points per keyword scan).
- AI completions and image generation calls.
- Citation directory submissions.

Without strict metering and reservation controls:
1. Concurrent user clicks or automated schedules could exceed tenant plan allowances and inflate provider bills.
2. Floating-point math in financial ledgers causes subtle rounding errors and reconciliations issues.

## Decision
1. **Integer Minor Units**:
   - All currencies and credit calculations use integer minor units (e.g., INR paise, USD cents) or discrete credit tokens (`1 credit = 1 SERP point scan`).
2. **Two-Phase Reservation Pattern**:
   Before initiating any asynchronous billable task:
   - **Phase 1: Reserve**: The system checks tenant allowance and atomically deducts an estimated hold (`status: RESERVED`) via a single SQL transaction:
     `UPDATE credit_balances SET reserved = reserved + :cost, available = available - :cost WHERE available >= :cost RETURNING id;`
   - **Phase 2: Finalize / Release**: Upon job completion, the worker finalizes the exact charge (`status: CHARGED`) and releases any unused held credits. If the job fails before external provider dispatch or encounters a validation rejection, the entire reservation is released (`status: RELEASED`).
3. **Location-Level Metering**:
   Multi-location organizations maintain per-location quota caps to prevent a single high-frequency location from exhausting the entire organization's shared budget.
4. **Idempotency**:
   Credit transaction records carry an `idempotency_key` bound to the `command_id` or `job_id`. Repeated finalization calls do not result in double deductions.

## Alternatives Considered
1. *Post-billing (charging after the job completes)*: High financial risk; malicious or misconfigured tenants could run hundreds of scans concurrently before the first balance check completes.
2. *Storing floating-point balances (`balance: 14.99`)*: Leads to IEEE-754 precision drift and reconciliation mismatches.

## Consequences
- Guaranteed zero-overage guarantee for tenants and platform operators.
- Complete financial transparency with audit trails for every credit reservation, charge, and refund.
