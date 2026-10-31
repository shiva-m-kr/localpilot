# LocalPilot Engineering Rules

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
Update docs/progress.md and EXECUTION_PROGRESS.md with implemented, verified and externally blocked states.
Keep tasks narrow; finish an end-to-end slice before broadening scope.
