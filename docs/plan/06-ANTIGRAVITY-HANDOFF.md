# Antigravity implementation handoff

Update 28 October 2026: the short Prompt 0–8 sequence in this document is retained as an earlier reference. Use [the new 100-prompt TXT](09-ANTIGRAVITY-100-PROMPTS.txt) for the current start-to-end implementation order. Project-rule and image-example guidance here remains supporting context.

## 1. Prepare a separate project

Create a fresh repository rather than asking Antigravity to overwrite the existing outbound application. Copy this blueprint to `docs/plan/`. Use LocalPilot as a placeholder name until branding/domain checks are complete. No runtime API keys are needed to build the UI prototype or migration skeleton.

The following are prompts to paste into Antigravity and proposed project scripts to implement. They are not claims that the project is already built or that commands have been executed.

Current Antigravity documentation distinguishes rules from reusable skills and notes a workflow-system transition after 19 October 2026. Prefer a root `AGENTS.md` for always-applicable constraints and ordinary tracked task documents. Do not depend on stale `.agent/workflows` instructions or invented slash commands. Verify the installed IDE/CLI's supported format. [Rules](https://www.antigravity.google/docs/rules/), [workflow transition](https://antigravity.google/docs/ide/workflows/).

## 2. Suggested root AGENTS.md

Copy the following into the NEW repository after reviewing it. It is a template, not an instruction file added to the current outbound repository.

```md
# LocalPilot engineering rules

Read docs/plan/README.md and the relevant detailed document before each feature.
Keep a modular TypeScript monolith with separate web and worker processes.
Do not claim private Outrank screens were inspected.
Use the design tokens and measured fonts in the UI specification.
Use original branding, copy and graphics; mark demo fixtures clearly.
Never invent analytics, keyword volume, rankings, customers or publish success.
Every tenant operation checks organization and location scope server-side.
Provider credentials stay encrypted and server-side.
Every external write checks revision, permission, consent, quota and pause state.
Jobs are at-least-once; unknown external outcomes require reconciliation.
Use one provider adapter pattern; no arbitrary provider proxy endpoints.
Enforce source-specific retention, especially for GBP API content.
Validate external URLs against SSRF and sanitize generated content.
Use structured templates, not arbitrary tenant JavaScript.
Keep models/prices configurable and record actual usage.
Make migration changes backward-compatible where practical.
Verify meaningful failure cases and actual authorized integration behavior.
Update docs/progress.md with implemented, verified and externally blocked states.
Keep tasks narrow; finish an end-to-end slice before broadening scope.
```

## 3. Prompt 0 — baseline decisions and scaffold plan

```text
Read docs/plan/README.md, 01-PRODUCT-AND-RESEARCH.md and 02-ARCHITECTURE.md.
We are building LocalPilot, an India-first local-business growth SaaS.
Inspect this repository and instructions before changing files.
Create docs/adr/ decisions for stack, tenancy, queue, provider adapters,
content revisions, source-specific retention, metering and hosted domains.
Check current supported library versions and PostgreSQL queue compatibility.
Create a small milestone backlog and docs/progress.md.
Then scaffold only the workspace, typed environment validation, CI and local
development dependencies. Do not implement every feature or fake integrations.
Do not enable public external writes or spend paid provider credits.
Report exact commands, changed files, verified checks and remaining dependencies.
```

## 4. Prompt 1 — orange design foundation

```text
Read 03-UI-DESIGN.md. Build a polished accessible UI foundation and marketing
homepage matching the measured public Outrank typography and spacing rhythm.
Use Plus Jakarta Sans for display/headline/buttons and Inter for body/nav.
At 1440px, hero type is 68/81.6px, 700, -1.2px tracking; large section
headings commonly 56/70px. Use the specified peach/orange palette and dark
orange accessible actions. Use original local-business copy and branding.
Build real semantic HTML components, not a generated screenshot as a page.
Implement responsive app shell, buttons, fields, tables, source/freshness badges,
integration states, right drawer and usage indicators.
Capture 1440, 1280, 768 and 390px viewport evidence; fix overflow and focus issues.
Keep all demo data visibly labeled and add no fabricated social proof.
```

## 5. Prompt 2 — fixture-driven application journey

```text
Implement onboarding, overview, calendar/list, content editor and ranking-grid
pages using shared typed fixtures. Include disconnected, quota-exhausted,
partial scan, needs-review and unknown-publication states.
Make navigation and editing interactions work locally without provider calls.
Use the page specifications in 03-UI-DESIGN.md and keep components reusable.
Show which controls are demo-only. Verify mobile agenda view and accessible
grid/table alternatives. Do not present fixtures as real analytics.
```

## 6. Prompt 3 — real tenancy and facts

```text
Implement Phase 2 only: managed auth, organization/business/location schema,
membership authorization, RLS, migrations, confirmed fact/provenance model,
resumable onboarding and safe authorized website import.
Do not trust browser organization IDs or imported instructions.
Test with two organizations, a hidden-address business and conflicting hours.
Prove cross-tenant API/DB/asset access is denied and unconfirmed facts cannot
silently replace confirmed facts. Include migration and recovery notes.
```

## 7. Prompt 4 — durable jobs and one real article

```text
Implement Phase 3 as one vertical slice: confirmed facts -> article draft ->
reviewed revision -> scheduled WordPress publish -> verified external URL.
Include Postgres queue/outbox, credit reservation, typed AI adapter,
claims manifest, deterministic validation, revision-bound approval and
WordPress credentials stored encrypted. Keep paid calls gated by config.
Test worker restart, duplicate commands, stale approval, revoked token,
cancel/pause and timeout-after-provider-acceptance. Reconcile before retrying
unknown outcomes. State clearly which parts have a real integration test.
```

## 8. Prompt 5 — ranking and search analytics

```text
Implement Phase 4: keyword clusters and target-page mapping, scan cost estimate,
DataForSEO queued Maps adapter, coordinate/grid configuration, task-level
errors, identity matching, explicit observation depth and compatible history.
Use the ranking definitions in 02-ARCHITECTURE.md; failed points are not ranks.
Add GSC property selection and observed search metrics as a distinct source.
Verify calculations with hand-checkable data and enforce cost caps atomically.
Do not treat GSC average position as an exact local-map rank.
```

## 9. Prompt 6 — hosted website and audit

```text
Implement Phase 5 with three constrained business templates, safe content blocks,
draft/published revisions, platform subdomains, verified custom domains and TLS
states. Add sitemaps, canonical metadata, structured data and safe contact forms.
Add bounded audits and a technical-fix proposal/approval/verify/rollback flow.
Prove host/cache isolation, private preview access and domain ownership checks.
Do not implement arbitrary tenant JS, a freeform builder or instant Google indexing.
```

## 10. Prompt 7 — provider approval-aware publishing

```text
Read Phase 6 and current official GBP/Meta docs before coding endpoints.
Document actual API versions, login routes, approved permissions and eligible
formats. Implement selected-asset connections, capabilities, express consent,
per-channel policies, media validation, token refresh/reconnect, independent
publication states and reconciliation. Keep unavailable capabilities disabled.
Do not claim completion using only developer-role accounts or mocked posts.
Enforce provider-content retention and prove disconnect cancels future actions.
Do not expose a generic GBP scripting proxy through our project credentials.
```

## 11. Prompt 8 — billing, citations and beta operations

```text
Implement Phase 7: citation NAP catalog/checks/tasks with evidence-based live
verification; subscription entitlements and atomic usage ledger; usage caps,
grace/cancellation/export; support diagnostics, alerts and emergency pause.
Test duplicate/out-of-order billing events, concurrent spend and unknown provider
outcomes. Run a restore drill and record evidence. Show full cost per location.
Only enable paid features that passed real end-to-end verification.
```

## 12. Later phase prompt template

```text
Implement only [named Phase 8/9 ticket] from the plan.
First inspect relevant domain contracts, schema and UI components.
State the user outcome, touched boundaries, external dependencies and acceptance
cases. Reuse existing patterns; avoid unrelated refactors and new services.
Implement the smallest complete slice, verify its meaningful failure cases,
and update progress with evidence. List externally blocked behavior explicitly.
```

## 13. Reusable task brief

```text
Task:
Owner outcome:
Plan sections to read:
In scope / deferred:
UI entry point and screen states:
Data/migration:
Organization/location permissions:
Consent/approval requirements:
Job states/idempotency:
Provider capability/version:
Usage limit and cost:
Failure/recovery behavior:
Acceptance evidence:
Rollback / documentation:
```

Ask the coding agent to include changed files, actual test results, screenshots for UI changes, an authorized integration result where appropriate, and unresolved external dependencies. A confident completion paragraph is not evidence.

## 14. Gemini image-generation commands

Use image generation for original decorative illustrations and approved illustrative content. Use HTML/CSS/SVG for the actual interface, maps, icons and charts. Do not generate fake premises, reviews, completed projects or customer results.

The companion [examples/generate-image.mjs](examples/generate-image.mjs) follows the current documented Gemini JavaScript Interactions example with a configurable model. It is an illustrative handoff utility; no paid generation was run or SDK integration tested during this planning task. Confirm the current SDK/API and model availability before production use. [Official image generation documentation](https://ai.google.dev/gemini-api/docs/image-generation).

After creating a NEW project and installing the current SDK there:

```powershell
# Run from the new project's root, after copying the example into scripts/.
npm install @google/genai
# Set GEMINI_API_KEY through your local secret manager or an untracked env file.
# The example reads the existing process environment; never paste a real key into Git.
node scripts/generate-image.mjs --prompt-file assets/prompts/hero.txt --out assets/generated/hero.png
```

No special `gemini --generate-image` flag is assumed. The Node script is a real command interface defined by the included example. `GEMINI_IMAGE_MODEL` defaults to the model shown in the current official example; the cheaper image adapter/model should be validated independently before switching production workloads.

Prompt: marketing illustration

```text
Create an original minimal editorial illustration for a local-business growth
platform. A small neighborhood shop, a subtle location pin, a calendar and
abstract connection lines. Warm white background, peach #FFEDD5 and orange
#FB923C, dark warm details. Soft daylight, restrained depth, generous whitespace.
No text, no logos, no customer names, no testimonial or performance figures.
This is a decorative illustration, not an interface screenshot.
```

Prompt: onboarding empty state

```text
An original simple warm-orange illustration of a storefront waiting to be
connected to a map and calendar. Clean white background, rounded geometric
forms, friendly professional style, low visual noise. No text or brand logos.
```

Prompt: illustrative local maintenance blog

```text
Create an editorial illustration explaining routine home plumbing maintenance,
with clean pipes, a wrench and a simple water droplet motif. No emergency scene,
no identifiable technician, no business logo, no before-and-after claims.
Warm neutral palette with subtle orange accents. Leave safe crop space.
```

For social designs, place approved owner photos in reusable 1080×1350, 1080×1080 or appropriate validated templates. Generate background illustration once, then render brand text/logo and crops deterministically. Store prompt, model, rights/approval state, dimensions and cost with the asset.

## 15. Proposed development scripts

Ask Antigravity to add these only when the corresponding workspace targets exist:

```text
pnpm dev                 # local web and worker
pnpm lint
pnpm typecheck
pnpm test:domain         # business invariants
pnpm test:integration    # DB, tenant isolation, queue and provider contracts
pnpm test:e2e            # critical owner flows
pnpm db:migrate
pnpm seed:demo           # visibly labeled fixture tenant
pnpm jobs:reconcile      # controlled operator reconciliation
pnpm build
```

Keep secrets in environment configuration and separate provider sandbox/test assets from production. A development command must not post to a real business or consume unbounded credits by default.
