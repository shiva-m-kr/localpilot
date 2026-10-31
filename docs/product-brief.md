# LocalPilot Product Brief & Implementation Contract

## 1. Executive Summary & Product Scope
**LocalPilot** is an honest, privacy-respecting, and evidence-grounded local business growth workspace. It is built as a TypeScript modular monolith with separated web and worker processes. It helps local single-location and multi-location businesses establish accurate presence, publish helpful content, measure real search visibility, track genuine competitor gaps, and manage reputation safely.

### Core Functional Pillars
1. **Local Business Onboarding & Multi-source Fact Engine**:
   - Progressive, resumable onboarding (website-first, GBP-first, or from scratch).
   - Authoritative Single Source of Truth for Name, Address, Phone (NAP), operating hours, service radius, and categories.
   - Privacy guarantees: private residential addresses for Service Area Businesses (SAB) are strictly hidden from public-facing drafts and third-party prompts.
   - Side-by-side fact conflict resolution with provenance tracking (source, timestamp, confidence).
2. **Website & Google Business Profile (GBP) Management**:
   - Integration with existing WordPress sites via authenticated REST API, and a fast hosted site builder with three structured templates (service, appointment, storefront).
   - Direct, authorized GBP location discovery, profile updates, and eligible local post publishing.
   - Sensitive field changes (business name, primary category, address, core hours) require explicit two-party human approval.
3. **Content & Social Publishing Engine**:
   - Grounded draft generation linked to verified business facts (claims manifest).
   - Strict avoidance of fabricated reviews, testimonials, prices, or fake availability.
   - Independent channel variants (WordPress/blog, GBP updates, Meta Instagram, Meta Facebook Pages).
   - Revision-bound approvals: changing content invalidates previous approvals.
   - Local timezone-aware calendar with quiet hours and blackout protection.
4. **Geographic Rankings & Visibility Intelligence**:
   - Coordinate-based grid ranking scans (e.g. via DataForSEO) with transparent point-level tracking.
   - True separation between coordinate Maps rankings, local-pack results, and Google Search Console (GSC) observed search queries/clicks.
   - Transparent visibility math: found-only averages, coverage denominators, and explicit display of failed/timeout points.
   - Pre-scan quota and credit reservation to prevent unexpected cloud bills.
5. **Competitor Intelligence & Journey Gap Analysis**:
   - Geography- and query-cluster-specific competitor identification.
   - Strict separation between owner-authorized GBP account data (never repurposed for prospecting) and public SERP discovery.
   - Objective content gap detection (e.g., missing emergency callout service details, missing booking links) without claiming causality for Google ranking algorithms.
6. **Citations & Local Presence Governance**:
   - Region- and vertical-specific citation directory registry.
   - Strict distinction between "form submitted" and "live verified citation".
   - Scheduled presence health checks and duplicate listing suppression.
7. **Reputation Management & Review Safeguards**:
   - Authoritative sync of incoming customer reviews via Google Review API / PubSub webhooks.
   - Ephemeral risk and topic classification (detecting complaints, safety/legal issues, privacy leaks, sarcasm).
   - Default review-first policy: negative or sensitive reviews strictly require owner intervention.
   - Narrow, explicit auto-reply policy only for verified positive, uncomplicated reviews with delay and daily caps.
   - Neutral review request invitations and QR code generation without illegal review gating or fake reviews.

---

## 2. Launch Market & Vertical Assumptions
- **Initial Target Market**: India-first, country-aware architecture (supporting Indian phone formats, GST/currency formatting in INR minor units, IANA timezones like `Asia/Kolkata`, and local service nuances), easily adaptable to US/UK/global markets.
- **Initial Focus Verticals**: Single-location service businesses (home services such as plumbing, electrical, HVAC, cleaning; salons/wellness; auto care). First validation begins with Home Services (plumbing/electrician/HVAC).
- **Branding & Visual System**: Original **LocalPilot** identity. Warm, accessible peach/orange palette (`#c2410c` action, `#fffdfb` canvas, `#fff6ee` soft surface, `#0d0d12` ink) matching measured spatial rhythm and typography: Plus Jakarta Sans for display/buttons, Inter for body/navigation.

---

## 3. Scope Boundaries & Research Register
- **Private Outrank UI**: The private Outrank dashboard, internal code, and vendor relationships were **never inspected or accessed**. All private application screens, flows, and data models are original LocalPilot designs. Only public landing page typography, geometry, and computed styles were referenced.
- **No Fabricated Data**: LocalPilot strictly forbids inventing rankings, fake reviews, imaginary keyword search volumes, or synthetic customer proof.
- **Security & Tenancy**: Strict multi-tenancy enforcement at organization and location boundaries via PostgreSQL Row-Level Security (RLS) and server-side authorization checks.
- **External Dependencies & Capability Gating**: Integrations with external APIs (GBP, Meta, WordPress, Google Search Console, Payment processors) remain cleanly abstracted behind provider adapters. Capabilities that lack production API approval or developer credentials remain explicitly disabled in the UI and blocked at domain boundaries rather than simulated with fake success.

---

## 4. Repository Structure Plan
```text
local-business-platform-blueprint/
├── apps/
│   ├── web/                    # Next.js web application (marketing, dashboard, tenant APIs)
│   └── worker/                 # Standalone Node worker process (durable jobs, sync, queues)
├── packages/
│   ├── domain/                 # Core entities, capabilities, business logic, state transitions
│   ├── db/                     # Drizzle schema, migrations, RLS, repositories
│   ├── contracts/              # Zod schemas, DTOs, API & job contracts, error definitions
│   ├── integrations/           # Provider adapters (WordPress, GBP, Meta, GSC, DataForSEO)
│   ├── ai/                     # Grounded prompts, claims validators, evaluation datasets
│   └── ui/                     # Shared UI tokens, accessible primitives, components
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── plan/                   # Blueprint specifications and research
│   └── progress.md             # 100-ticket implementation and verification register
├── EXECUTION_PROGRESS.md       # Master 100-prompt execution log
└── AGENTS.md                   # Engineering rules and operational constraints
```

---

## 5. Next Ticket & Scope Boundaries
- **Next Ticket**: `PROMPT 002 — Validate external capabilities before building against them`.
- **Scope Boundary**: No application code or database schema will be generated until feasibility, architecture decision records (ADRs), and workspace foundations are verified.
