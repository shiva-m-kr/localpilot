# ADR 001: Language & Web Framework — TypeScript and Next.js

## Status
Accepted

## Context
LocalPilot requires a unified stack capable of delivering:
1. High-converting, SEO-optimized public marketing pages and structured hosted websites.
2. An interactive, responsive SaaS workspace for local business owners (onboarding, calendar, content editor, rankings, reputation).
3. Secure API route handlers and server actions with strict authorization.
4. Seamless code-sharing (domain types, Zod contracts, validation schemas) between frontend, backend, and background workers.

## Decision
We select **TypeScript 5.x** and **Next.js 15+ (App Router)** with **React 19**.
- Web application resides in `apps/web`.
- Shared domain logic, contracts, and database models are partitioned into `packages/domain`, `packages/contracts`, and `packages/db`.
- Background worker runs as a dedicated Node process (`apps/worker`), importing compiled TypeScript contracts and domain logic directly.

## Alternatives Considered
1. *Python (FastAPI) + React SPA*: Would cause duplication of contract definitions between Pydantic and TypeScript/Zod; introduces friction in end-to-end type safety for solo/small teams.
2. *Remix / React Router 7*: Excellent SSR capabilities, but Next.js provides broader ecosystem maturity for hosted multi-tenant subdomains, edge routing, and image optimization.
3. *Microservices (NestJS + Next.js)*: Premature optimization that adds operational overhead, network serialization latency, and deployment complexity without adding business value.

## Consequences
- Single language (TypeScript) across the entire codebase simplifies maintenance, refactoring, and AI-assisted pair programming.
- Shared Zod validation schemas guarantee identical validation in the browser, server routes, and worker queues.
- Web process handles user requests and renders SSR pages; worker process runs independently to isolate heavy background tasks.
