# Local business growth platform — build blueprint

Prepared: 27 October 2026. Expanded: 28 October 2026. Working name: **LocalPilot** (placeholder; availability not checked).

**Latest handoff:** [Complete self-contained TXT](LOCALPILOT-COMPLETE-BUILD-HANDOFF.txt). It includes the core plan, expanded local SEO/reputation specification and exactly 100 ordered implementation prompts. Use that TXT as the primary Antigravity context.

Build an Outrank-inspired growth workspace for local businesses: connect an existing website or create a hosted one, connect Google Business Profile and social accounts, establish an accurate business knowledge base, measure visibility, and execute a controlled marketing plan.

## Read in this order

1. [Product and competitor analysis](01-PRODUCT-AND-RESEARCH.md) — product scope, verified Outrank features, feasibility, workflows, and release boundaries.
2. [Architecture and engineering specification](02-ARCHITECTURE.md) — stack, tenancy, schema, job reliability, adapters, security, hosting, and operations.
3. [UI and design specification](03-UI-DESIGN.md) — measured public Outrank typography, orange tokens, page specifications, responsive behavior, and visual acceptance criteria.
4. [Phased implementation roadmap](04-PHASES-AND-ACCEPTANCE.md) — dependencies, implementation tasks, acceptance gates, test strategy, and launch checklist.
5. [Costs and unit economics](05-COSTS-AND-LIMITS.md) — verified price inputs, transparent assumptions, example calculations, packaging, and spending controls.
6. [Original Antigravity handoff](06-ANTIGRAVITY-HANDOFF.md) — project rules, reusable task template, image generation example, and developer commands. Its shorter prompt sequence is superseded by the 100-prompt TXT below.
7. [Research evidence and sources](07-SOURCES-AND-OPEN-QUESTIONS.md) — source register, access limitations, design observations, and decisions to revisit.
8. [Expanded local SEO intelligence and reviews](08-LOCAL-SEO-INTELLIGENCE-AND-REVIEWS.md) — competitor evidence, recommendation engine, reputation, auto-reply safeguards, review acquisition and measurement.
9. [Exactly 100 Antigravity prompts (TXT)](09-ANTIGRAVITY-100-PROMPTS.txt) — implementation sequence from repository setup through verified pilot launch.

## Recommended starting decisions

| Decision | Recommendation |
|---|---|
| Initial audience | Single-location service businesses; India-first, country-aware architecture |
| Initial verticals | Home services, salons, auto services; validate one first |
| Product promise | Keep local presence accurate, publish useful content, measure visibility and leads |
| First paid release | Onboarding + facts + WordPress/hosted website + calendar + content + ranking baseline + approval-aware GBP/social publishing + basic citations |
| Architecture | TypeScript modular monolith; separate web and background-worker processes |
| Infrastructure | Managed PostgreSQL/auth + a small VM for web/worker + object storage |
| Cheapest infrastructure alternative | Self-host database too, only if someone owns backup and restore operations |
| UI | Public Outrank typography and spatial rhythm; light peach/orange palette; independently designed dashboard |
| Automation | Review-first default, then explicit per-channel policies and spending limits |
| Main expense control | Meter map points, scan frequency, generation attempts, and images |
| Website builder | Structured sections and templates; defer a freeform editor |
| Build method | One end-to-end slice at a time; working adapters and recovery states before more integrations |

**Timing estimate:** approximately 12–18 focused engineering weeks for a credible paid release, plus external approval time; 20–28 weeks for the fuller agency/citation/optimization platform. These are planning estimates for an experienced solo builder using AI assistance, not delivery guarantees. If GBP eligibility is not already met, its 60+ day prerequisite can extend the critical path.

**Budget estimate:** a managed pilot with ten active locations is modeled at roughly **$85–150/month**, excluding labor, taxes, payment fees, domains, paid directory submissions, and optional services. A self-hosted database can reduce cash cost but increases operational work. The cost document shows the arithmetic and separates prepaid credits from actual usage.

## Scope and evidence boundary

This is a researched implementation plan, not an implemented SaaS or an authenticated Outrank audit. Public pages, documentation, homepage screenshot, and computed styles were inspected. No Outrank account was created; private dashboards, internal architecture, and vendor contracts were not accessible. New product architecture and dashboard dimensions are explicit recommendations.

The existing outbound project has not been repurposed. All planning documents are isolated in this folder. The screenshot is at [Outrank public homepage](evidence/outrank-home-desktop.png).

The plan aims to match the reference's visual polish, typography, sizing rhythm, and familiar workflows, with original branding, copy, illustrations, and local-business information architecture. It does not claim that a public landing-page inspection verifies every private screen or exact mobile breakpoint.

## First action in Antigravity

Create a separate repository for LocalPilot. Load the complete TXT as project context, or copy this folder into its `docs/plan/` directory. Start with PROMPT 001 in the 100-prompt TXT and proceed one prompt at a time. That sequence replaces the earlier Prompt 0–8 examples. Do not ask the coding agent to generate the entire platform in one prompt. Expanded intelligence/reputation can add approximately 3–6 focused engineering weeks beyond the basic beta; validate after technical spikes and account approvals.
