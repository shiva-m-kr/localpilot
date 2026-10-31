# ADR 003: PostgreSQL Durable Jobs and Web/Worker Process Separation

## Status
Accepted

## Context
LocalPilot processes long-running asynchronous workflows:
- SERP grid coordinate scans (multi-point API requests).
- AI content generation, draft revisions, and image asset generation.
- WordPress publishing and external readback verification.
- Incoming webhook event ingestion and reconciliation.
- Scheduled publication and catch-up jobs across multiple timezones.

Browser timers or HTTP request lifetimes cannot be relied upon for these tasks. Introducing a separate Redis cluster at launch adds infrastructure cost ($15–$30/mo) and operational surface.

## Decision
1. **Queue Strategy**: Use a PostgreSQL-backed durable queue system (**pg-boss** or a dedicated transactional `jobs` table with `FOR UPDATE SKIP LOCKED` semantics).
2. **Web/Worker Separation**:
   - The web app (`apps/web`) accepts HTTP requests, verifies authentication/authorization, reserves credits, records transaction outbox events, and enqueues jobs with 202 Accepted.
   - The worker app (`apps/worker`) runs as an independent long-running Node daemon. It acquires job leases, runs idempotent tasks, reconciles external state, and updates job status.
3. **Connection Mode Spike & Verification**:
   - Background worker processes require a **direct session connection** to PostgreSQL (not through a transaction pooler like PgBouncer in transaction mode, which breaks LISTEN/NOTIFY and session-level advisory locks).
   - Jobs are organized into dedicated lanes (`publishing`, `reconciliation`, `generation`, `rankings`, `crawl`).

## Alternatives Considered
1. *Redis + BullMQ*: Standard choice for high throughput, but introduces an extra stateful dependency and operational cost for an early-stage local business SaaS with moderate job volume.
2. *In-Process Background Tasks (e.g. Next.js `waitUntil`)*: Unreliable on serverless/container restarts; can cause dropped jobs or duplicate writes during deployment.
3. *Cloud Queues (AWS SQS / Google Cloud Tasks)*: Vendor lock-in that complicates local development and self-hosted deployments.

## Consequences
- At-least-once job delivery requires all worker tasks to be strictly idempotent.
- Crashes during job processing result in automatic lease expiration and controlled retries.
- Transactional outbox pattern guarantees that database state updates and job creations are committed atomically.
