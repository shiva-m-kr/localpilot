# Phased implementation and acceptance gates

## 1. Delivery assumptions

Estimate: one experienced full-stack builder using Antigravity, approximately 25–35 focused development hours/week, starting a separate codebase. Durations are engineering estimates, not guarantees. Platform approvals, account eligibility, DNS, business verification and stakeholder review can extend elapsed time.

Build a narrow real workflow early; the entire UI need not be integrated before one location can publish a verified article. UI fixture work and external approval applications can happen alongside implementation without requiring multiple agents.

Critical path: eligibility/approval requests → identity/tenancy → facts → content/revisions → approval/queue → real publishing → metering/recovery → paid pilot. Ranking, hosted sites and provider adapters attach to the same core. GBP/Meta capabilities stay disabled until approved and tested with external-owner accounts.

## Phase 0 — feasibility and decisions (3–5 days, approvals continue)

Deliverables:

- Validate one target vertical with 3–5 owners: current site, profile, accounts, budget, biggest repetitive tasks and definition of a useful lead.
- Confirm target launch country, initial language, payment business eligibility and privacy requirements.
- Submit GBP access request if prerequisites are met; otherwise record eligibility date and website-first launch scope.
- Register/configure Meta application and identify exact login route, permissions, review evidence, test accounts, version and business-verification requirements.
- Run three technical spikes: WordPress upload/publish/update; rank-provider coordinate accuracy/identity/depth; managed PostgreSQL queue connectivity/privileges.
- Capture public design measurements and set orange tokens; approve no fake proof/testimonials.
- Write ADRs for stack, tenant hierarchy, queue, content storage, hosted sites, provider retention and metering.
- Create spend-rate configuration with source URL, verified date and expiry/review date.

Gate: a demonstrable route exists for each paid-beta capability. Block unsupported operations individually. Do not sell automatic GBP/social posting solely because mocks work. Scope any API ambiguity as a named unresolved risk with an owner.

## Phase 1 — UI foundation and prototype (1–2 weeks)

Build marketing page, auth layouts, shell, onboarding, overview, calendar, editor and rankings page using labeled fixtures. Implement design tokens, typography, responsive shell, component primitives and all critical empty/error states. Add source/freshness and usage components now.

Demo datasets: a service business with existing WordPress/GBP; a new salon requiring a hosted website; an agency with two locations; a hidden-address service-area business. Include failed/revoked integrations and incomplete grid scans.

Gate: design review across four viewport sizes; no overflow; keyboard navigation works; page content matches product vocabulary; fixture mode is visibly labeled. Produce screenshot evidence and a list of reusable components. Do not write elaborate unit tests that merely assert static colors or headings.

## Phase 2 — authentication, tenancy and facts (1–2 weeks)

Implement auth, organization/business/location setup, memberships, RLS, migrations, encrypted-secret interface, ownership-safe asset uploads, business facts/provenance and resumable onboarding. Add crawl import with SSRF protections, limits and a fixed allowlist of extractable fact types. Confirm facts before use.

Gate:

- Tenant A cannot read/write/export tenant B data or assets.
- A hidden address never appears in a public preview or generation context.
- Unconfirmed/conflicting fields remain visible and cannot silently overwrite confirmed facts.
- Import failure is resumable; source text cannot execute instructions or change permissions.
- Auth recovery and member removal revoke access as expected.

## Phase 3 — first real content-to-WordPress flow (2 weeks)

Implement queue/outbox, credit reservations, AI provider abstraction, brief/draft schemas, deterministic checks, revision history, editor save conflict handling, approval hash binding, schedule occurrences, WordPress integration and verified publish URL. First flow: confirmed facts → one article draft → owner approval → scheduled WordPress publication → verified result.

Gate:

- Worker restart between upload and publish causes no blind duplicate post.
- Timeout-after-acceptance enters reconciliation instead of reposting.
- Editing approved content invalidates stale approval.
- Quota check and reservation are atomic under simultaneous requests.
- Revoked integration/pause/cancel blocks pending dispatch.
- Real test publication is demonstrated on an authorized test site; mocks are supplementary.

Private alpha can start here, with honest limited scope.

## Phase 4 — local keyword planning, rankings and GSC (1–2 weeks)

Build keyword clusters, intent/target-page mapping, plan generation, baseline scan estimate, provider task handling, rank identity matching, grid visualization, scan history and GSC OAuth/property selection. Keep GSC source-date timezone separate from location scheduling timezone.

Gate:

- Three keywords at distinct coordinates return reproducible request metadata and correct target identity.
- Not-found and provider-error points are distinct.
- Top-3 coverage and found-only average match hand-calculated fixtures.
- Run comparison rejects incompatible grids/depths.
- On-demand scans require quota/cost check; repeated click does not duplicate charge.
- GSC missing/limited rows and data delay are explained, never replaced with invented values.

## Phase 5 — hosted websites and technical audit (2–3 weeks)

Build three constrained templates, block editing, draft/publish revisions, platform subdomains, verified custom domains, HTTPS state, contact forms, sitemap/robots/canonical/structured-data generation, audit crawler and issue/fix workflow. Publish hosting terms, export expectations and cancellation behavior.

Gate:

- Two tenants cannot serve each other's content through host/header/cache confusion.
- Draft pages require authorization and do not leak through search or public JSON.
- Domain ownership is verified before routing; expired/cancelled domain claims cannot be hijacked.
- Forms have abuse controls and observable delivery.
- Robots/canonical/redirect changes support preview, approval, verification and rollback.
- Rendered public HTML contains content/metadata without requiring client execution.
- Sitemap lists only published canonical URLs; 404s and redirects use correct status codes.

## Phase 6 — GBP and Meta publishing (2–3 weeks; approval-dependent)

Implement selected-asset OAuth connections, capability registry, consent UI, explicit field diffs, eligible GBP post publishing, current performance reads subject to policy, Facebook Page posts and Instagram supported image publishing. Defer reels/stories until basic image publishing is reliable. Implement disconnect/reconnect, media processing, signature validation, notification inbox and provider reconciliation.

Gate:

- Approved app works for an external pilot owner's selected assets, not only developer-role assets.
- Actual scopes and token routes match official current requirements.
- Owner-specific consent is recorded and enforced immediately before dispatch.
- Expired/revoked tokens produce an actionable reconnect state.
- One campaign can have blog success and Instagram failure without duplicate blog publication.
- Provider-supplied content retention/deletion jobs work, including logs and backups as required.
- Unsupported categories/formats are blocked with an explanation.

Do not claim this phase is done while app review is pending. If blocked, continue website/ranking/content beta and label channel publishing unavailable.

## Phase 7 — citations, billing and paid-beta hardening (1–2 weeks)

Implement directory catalog, NAP checks, prepared submission packet, owner verification tasks and evidence of live listings. No universal automatic-submission claim. Add subscription integration, per-location entitlements, atomic allowance/credit ledger, usage page, spending limits, grace periods, cancellation and exports. Payment processor selection is confirmed in Phase 0; provider fee rate is configuration, not hardcoded.

Gate:

- Submitted citation cannot count as verified live without evidence.
- Duplicate/out-of-order billing webhooks do not double-credit or incorrectly reactivate a cancelled plan.
- Plan changes and time-window resets preserve ledger correctness.
- Overage is disabled unless explicitly enabled/prepaid.
- Trial abuse cannot create unlimited AI/rank jobs.
- End-to-end support runbooks, kill switch, metrics and alerts are operational.
- Restore drill completed; documented RPO/RTO targets supported by evidence.

Phases 0–7 collectively form the approximately 12–18 week engineering envelope. Do not sum each minimum as an external-approval promise; some UI/spike work overlaps, while unpredictable review waits do not disappear.

## Phase 8 — optimization and reputation (2–4 additional weeks)

Add review reply drafts/approval, neutral review links, lawful outreach only if enabled, content performance candidates, revision comparison and controlled republishing. Refreshes preserve external IDs, slugs, valuable links and owner changes. Add a cooldown and minimum-data threshold before suggesting updates. Validate Hindi generation with reviewers if introducing it.

Gate: candidate selection shows source data and uncertainty; updates cannot erase custom content; owner may reject/restore; no invented attribution or reviews; provider-specific current retention policies still apply.

## Phase 9 — agencies and scale (3–6 additional weeks)

Build scoped team/location groups, bulk policy application with per-location results, agency usage allocation, report branding, partner citation fulfillment, optional more CMS adapters and operational scaling. Add advanced onboarding only after single-location activation is sound.

Gate: bulk actions preserve consent/permissions per location, agency users cannot cross client scopes, queued work is fair, billing reconciles by active locations and measured credits, and load tests meet measured workload targets.

Optional AI-visibility tracking and weekly tool generation need separate evaluation, budgets and product validation. They are not dependencies of a useful local-business launch.

## 2. Engineering task sizing and productivity

Each implementation ticket should fit 0.5–2 development days and contain: owner problem, route/UI entry, schema change, permission requirement, state transitions, provider contract, failure cases, acceptance evidence and migration/rollback notes.

Example ticket: 'Schedule an approved WordPress article'. Scope includes immutable revision, destination authorization, timezone conversion, idempotent command, quota reservation, queued state and verification URL. It excludes AI generation, social publication and billing UI. This prevents a coding agent from implementing shallow versions of six modules simultaneously.

Maintain a progress file with states planned/in-progress/implemented/verified/externally blocked. A screen that works only with fixtures is implemented visually, not verified functionally. Review generated migrations and dependencies before merging. Prefer one editor, one form library and one provider adapter pattern.

## 3. Meaningful testing strategy

| Risk | Required evidence |
|---|---|
| Tenant leakage | DB/RLS/API/asset negative tests with two organizations |
| Duplicate posts | Worker crash, retry, duplicate command, timeout and reconciliation scenarios |
| Unauthorized publishing | Role, consent revision, resource edit, disconnect and pause tests |
| Wrong costs | Parallel reservations, repeated webhook, cancelled job, failed attempt and reset tests |
| Wrong ranks | Failed/missing/censored observations; identity ambiguity; comparison compatibility |
| Website damage | Host isolation, draft leak, robots diff and rollback, domain takeover scenario |
| Untrusted crawl | Private IP/redirect/DNS/oversize payload protections |
| Bad generated claims | Evaluation fixture set and human spot review |
| Broken integration | Contract fixtures plus a minimal real authorized end-to-end run |
| UI regressions | Key viewport screenshot comparison and accessibility checks |
| Recovery | Restore DB, keys, media references and resume schedules without duplicates |

Do not spend the initial budget testing every presentational wrapper. Prioritize the cases that could post the wrong content, expose a tenant, bill incorrectly, or break a customer website.

## 4. Launch pilot and release checklist

Pilot with 5–10 businesses. Week one: owner onboarding, fact confirmation, one reviewed campaign and rank baseline. Week two: scheduled activity and failure handling. Subsequent weeks: usefulness, owner time saved, actual enquiries, content approval rate and operating costs. SEO outcomes need longer observation than a two-week operational pilot.

Before charging for a feature: published scope matches working capabilities; pricing includes actual quotas; terms/privacy/contact and deletion flows exist; provider approvals valid; billing reconciled; no duplicate publication under retry; no demo data in live screens; production/staging isolated; alert routing and restore evidence exist; support owner assigned; deployment rollback tested.

## 5. Release risk register

| Risk | Mitigation / release decision |
|---|---|
| GBP eligibility/review delay | Apply immediately; ship website/content/rank path independently |
| Meta permission/review failure | Keep export/manual delivery as labeled fallback, not fake auto-posting |
| Public/private UI mismatch | Ship clearly proposed dashboard; refine from authorized references later |
| Cheap model produces weak content | Evaluation, lower cadence, better facts and quality-tier upgrade |
| Rank costs spike | Estimates, hard caps, queued mode and bounded scan sizes |
| Directory lacks API | Owner task or partner fulfillment with explicit fee/status |
| Queue overload on small VM | Concurrency limits, resource monitoring and separate heavy audit lane |
| Provider storage restrictions | Source separation, TTL/deletion and gated historical reporting |
| Website automation breaks SEO | Before/after snapshots, approval, verification and rollback |
| Owner expects guaranteed rankings | Transparent metrics and product promise tied to work/measurement |
