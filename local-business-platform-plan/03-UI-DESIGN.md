# UI design specification

## 1. Evidence and matching approach

The public Outrank homepage was inspected at 1440×1000 using a browser screenshot and computed styles on 27 October 2026. [Reference screenshot](evidence/outrank-home-desktop.png). These measurements are a viewport-specific reference, not a complete responsive specification. The private application was not accessible.

| Element | Observed public desktop value |
|---|---|
| Hero heading font | Plus Jakarta Sans |
| Hero heading | 68px, weight 700, 81.6px line height, −1.2px letter spacing |
| Hero heading box | 680px wide, approximately 163px tall over two lines |
| Major section heading | Commonly 56px / 70px, weight 700, approximately −1.44px tracking |
| Another section heading variant | 44px / 55px, weight 700, −0.8px tracking |
| Testimonial card heading | 20px / 25px, Plus Jakarta Sans, weight 700 |
| Feature subheading | 20px / 27.5px, Inter, weight 700, −0.47px tracking |
| Navigation text | Inter, 14px, weight 600, approximately 23.8px line height |
| Hero button text | Plus Jakarta Sans, 18px / 28px, weight 600 |
| Header Google button | Plus Jakarta Sans, 14px / 20px, weight 600; 46px high |
| Hero Google button | Approximately 237×70px, fully rounded |
| Hero primary button | Approximately 270×70px, fully rounded |
| Main ink | `rgb(13,13,18)` / `#0D0D12` |
| Reference primary | Purple `rgb(136,42,255)`; replace through orange tokens |

Visual observations: wide capsule navigation near the top; white canvas with a very faint square grid; soft colored glows near the sides; centered two-line hero; colored accent words; two large rounded CTAs; small floating UI cards around the headline; compact proof row; large whitespace; rounded white sections. Loaded font families included Inter, Plus Jakarta Sans and Poppins; loading a font does not establish that it is used for a given element. Use the measured family per element above.

Preserve typography and layout rhythm. Use new logo, wording, illustrations and local-business UI previews. Exact private-dashboard fidelity requires authorized dashboard references later. All dashboard dimensions below are proposed specifications.

## 2. Orange design tokens

Use light peach for surfaces, stronger orange for meaningful actions, and dark warm ink for contrast. Pale orange alone is insufficient for primary-button text contrast.

```css
:root {
  --font-display: "Plus Jakarta Sans", sans-serif;
  --font-body: "Inter", sans-serif;
  --canvas: #fffdfb;
  --surface: #ffffff;
  --surface-soft: #fff6ee;
  --surface-selected: #ffeddc;
  --brand-50: #fff7ed;
  --brand-100: #ffedd5;
  --brand-200: #fed7aa;
  --brand-300: #fdba74;
  --brand-400: #fb923c;
  --brand-500: #f97316;
  --brand-600: #ea580c;
  --brand-700: #c2410c;
  --action: #c2410c;
  --action-hover: #9a3412;
  --ink: #0d0d12;
  --text-secondary: #57534e;
  --text-muted: #78716c;
  --border: #e8e2dc;
  --focus: #c2410c;
  --success: #15803d;
  --warning: #a16207;
  --danger: #b91c1c;
  --info: #1d4ed8;
  --radius-control: 10px;
  --radius-card: 16px;
  --radius-panel: 24px;
  --radius-pill: 9999px;
  --shadow-card: 0 2px 8px rgb(40 24 8 / 4%);
  --shadow-float: 0 12px 36px rgb(194 65 12 / 10%);
}
```

Dark orange with white text for ordinary primary actions; peach with dark orange text for secondary actions; peach glows for marketing. Validate final actual contrast combinations with tooling. Keep semantic success/error distinct from brand orange. A selected orange item also uses an indicator or border, not color alone.

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120. Icons: 16px inline, 18–20px navigation, 24px feature cards. Body font weights 400/500/600; display 600/700. Use tabular numerals for financial/ranking tables. Self-host properly licensed font assets through a framework font loader, with fallback and minimal required weights.

### Typography and sizing

| Role | Desktop | Mobile | Notes |
|---|---|---|---|
| Marketing hero | 68/81.6, 700 | proposed 38/46, 700 | Same measured desktop type; responsive value is proposed |
| Marketing section | 56/70, 700 | 32/40 | Max line lengths and deliberate wrapping |
| Secondary heading | 44/55 | 28/36 | Avoid every section competing with hero |
| App page title | 28/36, 700 | 24/32 | Display font |
| App section title | 18/26, 600 | 18/26 | Display font |
| Body | 14/22 app; 16/26 marketing | 14/22 or 16/24 | Inter |
| Form labels | 13/20, 500 | 13/20 | Persistent labels |
| KPI value | 30/38, 700 | 26/34 | Show unit and period |
| Metadata | 12/18 | 12/18 | Never use tiny text for critical errors |

## 3. Marketing site

Container max width 1232px for major sections; 48px outer desktop margin for the capsule header at 1440px; 20px mobile gutter. Proposed section vertical spacing 96–120px desktop, 56–72px mobile. White/peach backgrounds alternate subtly.

Page order:

1. Capsule header: original logo, How it works, Features, For local businesses, Pricing, sign in, CTA.
2. Hero: local visibility headline in two lines; orange accent; short explanation; Google sign-in and preview CTA. Decorative real-UI fragments show calendar, a local grid and publishing status.
3. Product preview: actual product screenshot once available. Before launch, label as product preview/demo.
4. Three steps: connect your business, confirm your plan, let approved work run.
5. Feature blocks: local rankings, business profile, content/social, website health, citations.
6. Local-business scenarios: plumber, salon, auto repair with clearly illustrative examples.
7. Integration strip with correct platform logos/attribution and only supported capabilities.
8. Pricing and precise quota explanations.
9. FAQs on verification, rankings, content review, domains, disconnecting and cancellation.
10. Final CTA and footer with company/contact/privacy/terms.

Do not copy Outrank's customer avatars, testimonials, metrics or performance promises. Show no numeric customer proof until earned. Keep floating cards decorative and noninteractive if they are not real controls; hide decorative detail on smaller screens and respect reduced motion.

## 4. Application shell

Desktop ≥1280px: 248px left sidebar, 72px top bar, content max 1440px with 32px page padding; ordinary card gaps 20–24px. Tablet 768–1279px: collapsible 76px rail or drawer and 24px padding. Mobile <768px: 56px header, drawer navigation, 16px padding, stacked content, horizontally scrollable data tables only where necessary. No whole-page horizontal overflow.

Sidebar: organization/business/location switcher, Overview, Content calendar, Content studio, Local rankings, Business Profile, Social accounts, Website & SEO, Citations, Reports; bottom Settings, Usage & billing, Help. Reviews appears only when enabled. For a single-location owner, hide unnecessary hierarchy until relevant.

Top bar: breadcrumb, date range where meaningful, connection-status indicator, notifications, profile. Show a persistent 'Autopilot paused' state with a clear resume path; do not rely on a toast to communicate it.

## 5. Page-by-page specification

### 5.1 Onboarding

Centered max-width 960px with left progress column on desktop and compact step count on mobile. Steps: business → facts → accounts → goals → plan → automation. Save progress after each step. Imported values have source chips; conflicting fields show alternatives side by side. Skip available for optional integrations. Background crawl shows stages, partial results and retry/cancel.

### 5.2 Overview

Top: business name, selected location, timeframe, automation status and 'Review pending work' action. Four KPI cards: organic clicks, sampled top-3 grid coverage, verified enquiries, published items. Disconnected sources show 'Connect to measure', not zeros.

Main 8/4 column layout: trend card and 'Needs your attention' queue. Under that: upcoming content, current visibility grid summary, last completed automation actions and usage. Status cards explain source and freshness, e.g. 'Maps scan · 25 Oct · 9/9 points'. A task has action, reason, impact, deadline if any, and a direct CTA.

### 5.3 Content calendar

Toolbar: month/week/list, previous/next/today, channel/location/status filters, create campaign. Desktop month uses seven columns with ≥112px day cells. Items show channel icon, short title, time and explicit state. Use a neutral pending color, green published, yellow needs review, red failed. On mobile default to agenda/list rather than squeezing seven unreadable columns.

Click opens a 480px right drawer: content previews, destination, source facts, schedule/timezone, approval state, usage estimate and activity. Provide keyboard-accessible reschedule controls as an alternative to drag-and-drop. A failed channel has its own retry/reconnect action.

### 5.4 Content studio/editor

Desktop: title/metadata top; editor approximately 60–66% width; right panel with channel previews/checks/facts. Optional 240px content list can collapse. Sticky bottom actions: Save draft, Submit for review, Approve/schedule according to role. Autosave state with last saved time and conflict handling.

Editor tabs: Article, GBP, Instagram, Facebook. AI actions are explicit selection rewrite, tone change, shorten, add grounded FAQ; each shows a diff or new revision. Image selection shows original/generated label and approved-photo restrictions. Character/media limits come from the selected adapter's current validators.

### 5.5 Local rankings

Keyword selector, grid size/spacing, date/run selector, device/locale, target identity, 'Estimate scan' then 'Run scan'. Show monetary/credit cost and current allowance. Grid circles display rank numbers and accessible status labels; table alternative lists coordinates and observations. Add legend for 1–3, 4–10, 11–20, >20 and error.

Right panel: top-3 coverage, found-point average with sample count, competitor observations and scan quality. History compares compatible runs. No 'rank 0'. A failed scan does not show a successful green map. Provider age and incomplete points remain visible.

### 5.6 Business Profile

Tabs: Overview, Business details, Posts, Reviews when supported, Performance. Top connection/verification/capability state. Business details use a side-by-side 'Current provider value / Proposed value' diff with source notes. Sensitive changes require explicit approval and a traceable status. Do not copy Google's own interface or imply Google endorsement.

### 5.7 Social publishing

Connection cards show exact Page/account name and profile image, supported formats, last success, permissions and reconnect action. Composer previews Instagram and Facebook separately. Aspect ratio presets and safe crops are deterministic; captions/hashtags editable. Instagram caption links are not represented as guaranteed clickable outbound links; use appropriate supported link destinations and messaging.

### 5.8 Website and SEO

Tabs: Website, Pages/blog, Audit, Technical settings, Domain, Leads. New website setup: choose one template, confirm facts, choose photos, preview and publish. Page editor uses blocks with constrained reorder controls and editable content.

Audit issue table: severity, affected URL, finding, evidence, fix mode (automatic/approval/manual), last checked, status. Issue drawer shows actual diff and rollback availability. Robots preview has a fixed-width editor, validation, impact summary, backup and explicit apply action. Domain page shows DNS ownership, routing, certificate and final health as separate stages.

### 5.9 Citations

NAP summary at top; directory table with region/category, live URL, match/mismatch fields, ownership, workflow state, next owner step and fees. 'Prepared', 'Submitted', 'Verified live' are visibly different. No unverified count labeled as backlinks built.

### 5.10 Reports

Source/date filters, matched-period comparisons, activity summary and downloadable CSV first. Email/PDF reports later. Show actual enquiries separately from website clicks and direction requests. Plain-language methodology drawer. No claim that a post caused a ranking change solely because it preceded it.

### 5.11 Settings and billing

Organization, team/location permissions, business facts, brand, integrations, automation policies, privacy/export/delete, usage, subscription. Usage meters show included, reserved, spent, remaining and next reset. Upgrade/overage approval uses exact units and no surprise recurring spend.

## 6. Reusable components

### Added screens: competitor intelligence and reputation

Competitors: service/query-cluster and geography filters, owner-entered versus discovered lists, stable entity confirmation, comparable date/window badge, evidence-based comparison table and a useful gap shortlist. Show unavailable data and sample sizes explicitly. Selecting a competitor opens source observations and an action proposal, not an unsupported explanation of Google's algorithm.

Intelligence: weekly priorities with evidence, uncertainty, effort/cost, prerequisites, owner decision, cooldown and outcome status. A recommendation drawer shows the exact proposed change, who approves it, execution verification and observation period. Use internal-priority labels rather than probabilities of ranking success.

Reviews: inbox/list on desktop, readable cards on mobile, filters for location/provider/rating/language/risk/status, accessible review drawer, source freshness, existing reply, draft/diff, classification reasons and assignee. Place policy mode and pause state above the queue. A five-star complaint can be visibly flagged for review. Auto-reply setup includes sample previews, exclusions, language allowlist, caps, consent and revocation; keep its control disabled when provider requirements are unresolved.

Review acquisition: neutral link/QR and separately enabled transaction-request settings, consent/suppression/frequency and delivery status. No happy-customer-only funnel. Service recovery has private notes clearly separated from the exact public reply preview. Verified public changes include a provider link where available.

Build typography, Button variants, TextField, Select, combobox, FormField, status badge, data table, filter bar, KPI card, empty state, integration card, source/freshness badge, cost estimate, confirm diff, right drawer, timeline, calendar item, grid point, media picker, revision diff, approval controls, usage bar and notification banner.

Keep one central status map so published/failed/review states do not drift across screens. Buttons have visible loading state and duplicate-submit prevention. A 44px mobile target is the default. Dialogs trap focus, return focus to trigger, support Escape except during a truly noninterruptible local operation, and have proper names.

## 7. Required screen states

Every integration-driven screen includes: loading, first-use empty, no data yet, disconnected, expired permission, unsupported capability, provider approval pending, partial success, stale data, quota exhausted, unknown publication outcome and offline/retry state. Use seeded fixtures to review all states before wiring real providers.

Never fabricate success data when integration fails. Success feedback includes a verified external URL when available. A queued action is described as queued; provider acceptance is described as pending until publication is verified.

## 8. UI quality gates

- Capture at 1440×1000, 1280×800, 768×1024 and 390×844.
- Check display fonts actually loaded, heading wraps, primary button size and consistent gaps.
- Compare the desktop marketing hero to the measured reference; public measurements are the reference, private app screens are original designs.
- Test keyboard-only navigation, focus visibility, dialog behavior, screen-reader labels, color contrast and reduced motion.
- Verify no layout shift from fonts/images and reserve chart/media height.
- Test long business names, Hindi text, large currency values, multi-location switcher and 200-character post titles.
- Show real or labeled-demo data; never mix fixture metrics into a connected live account.
- Target good user-perceived performance; evaluate public-site LCP ≤2.5s, CLS ≤0.1 and INP ≤200ms with appropriate field/lab interpretation rather than promising a perfect Lighthouse score.
- CSS grid, real charts and semantic HTML create product UI. AI image generation is for illustration/photos, never rasterized navigation or text-based dashboard controls.
