# ADR 009: Modular Monolith Internal Boundaries for Intelligence and Reviews

## Status
Accepted

## Context
Phase E (Rankings & Intelligence) and Phase F (Reviews & Reputation) introduce sophisticated analytical and automation features:
- Competitor discovery and gap analysis.
- Deterministic local SEO detection rules.
- Review synchronization, risk classification, and auto-reply policies.
- Experiment tracking and outcome attribution.

Building these as independent microservices or autonomous agent loops introduces high network overhead, distributed transaction failures, complex monitoring, and operational fragility for a small engineering team.

## Decision
1. **Modular Monolith Architecture**:
   Implement `local-intelligence`, `competitors`, `reputation`, and `recommendations` as discrete internal domain modules within the unified monolith codebase (`packages/domain` and `apps/worker`).
2. **Domain Boundaries & Module Isolation**:
   - Modules communicate via explicit TypeScript domain interfaces and events.
   - Internal modules **cannot bypass** domain permission and tenant isolation checks.
   - Modules call standard domain services (facts, storage, metering, queues) rather than reaching into external provider SDKs or raw database connections directly.
3. **Queue Spike & Session Connection Verification**:
   - We verified that the PostgreSQL queue requires a dedicated session connection (not through PgBouncer in transaction pooling mode).
   - The queue schema is isolated into a dedicated `jobs` table to prevent connection starvation or table-level locking conflicts with tenant tables.
   - Queue privileges are restricted to the worker role with `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the job queue table.

## Alternatives Considered
1. *Independent Microservices (e.g. Python Intelligence Service + Go Review Worker + Node Web)*: Introduces significant network latency, serialized DTO boilerplate, polyglot maintenance burden, and distributed tracing complexity without tangible scaling advantages at pilot stage.
2. *Unbounded Autonomous Agent Loops*: High risk of runaway token consumption, hallucinations, non-deterministic edits, and uncontrolled external API mutations. Replaced with bounded deterministic detection rules paired with grounded AI draft generation.

## Consequences
- Single cohesive codebase with fast compile times, unified type checks, and zero serialization overhead between modules.
- Clear module boundaries allow future extraction into microservices if specific workloads (e.g. SERP parsing) require independent horizontal scaling.
