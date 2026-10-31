# ADR 002: Managed PostgreSQL, Drizzle ORM, and Managed Authentication

## Status
Accepted

## Context
LocalPilot manages sensitive multi-tenant business data (locations, facts, credentials, review caches, billing records). It requires:
1. Rock-solid relational integrity with foreign keys, composite constraints, and transaction safety.
2. Row-Level Security (RLS) support for robust tenant isolation.
3. Lightweight, transparent SQL migrations and query execution without heavy ORM memory overhead.
4. Battle-tested, secure authentication (OAuth 2.0 with Google, magic links/passwords, session handling, CSRF protection) without building custom password hashing or crypto primitives.

## Decision
1. **Database**: Managed **PostgreSQL 16+** (e.g. Supabase or Neon / managed cloud Postgres).
2. **ORM / Query Layer**: **Drizzle ORM** with `drizzle-kit` for versioned declarative SQL migrations.
3. **Authentication**: Managed auth (Supabase Auth / Lucia / NextAuth session cookies) with:
   - Google OAuth and Email/Magic Link options.
   - Encrypted session cookies (HTTP-only, Secure, SameSite=Lax).
   - Strict organization membership lookup on every authenticated mutation.
   - Distinct visibly-labeled "Demo Mode" that never touches production tenant tables.

## Alternatives Considered
1. *Prisma ORM*: Generates heavy Rust binaries, higher cold starts, and complex connection pooling requirements in background worker environments.
2. *Custom Authentication (Bcrypt + JWT)*: High security liability; building custom password reset, email verification, and MFA is error-prone and distracts from core platform capabilities.
3. *MongoDB / NoSQL*: Lack of relational integrity across organizations, businesses, locations, and campaigns makes multi-tenant constraint enforcement fragile.

## Consequences
- Drizzle provides TypeScript inference directly from schema definitions with zero runtime overhead.
- SQL migrations are transparent, inspectable, and reversible.
- Tenant isolation is backed by database constraints and composite keys (`organization_id`, `location_id`).
