# Local SEO intelligence, competitor research and reputation specification

Added 28 October 2026. This expands the original blueprint. All scoring systems, schedules, thresholds and automation rules below are proposed product designs, not disclosed Google ranking formulas. This document is also embedded in the complete TXT handoff.

## 1. What intelligent operation means

The software should run an evidence-to-action cycle, not generate generic advice repeatedly:

Collect authorized observations → resolve business identity → validate freshness and completeness → detect a specific gap → identify plausible explanations → choose a bounded action → check consent/cost/risk → create or execute work → verify execution → observe later outcomes → retain, revise or stop the tactic.

For every recommendation answer: What did we observe? Where and when? What is missing? Why might this matter? What will change? Who approves? What will it cost? How will successful execution be checked? When will we evaluate outcomes? What else could explain the result?

Example: a plumbing business has a genuine emergency-callout service, but its page does not mention availability or the booking destination. The engine detects the mismatch from confirmed facts and the crawl, proposes a useful service-page edit, obtains approval, publishes a revision, verifies the HTML and booking link, then compares later matched-period search and enquiry observations. It must not claim that adding a keyword guarantees ranking gains.

## 2. Evidence and intelligence architecture

Add modules `local-intelligence`, `competitors`, `reputation`, `recommendations` and `experiments` inside the existing monolith. They call the existing facts, jobs, permissions, integrations and metering services. Do not introduce a new microservice or autonomous agent platform for each module.

New data structures:

- `evidence_records`: organization/location, subject, source class, source resource, observed time, coverage, uncertainty, permitted purpose, expiry, integrity hash and current availability.
- `entity_matches`: target/provider identity, confidence components, disambiguation reason and owner confirmation.
- `competitor_sets`: location, query cluster, grid/config version, entity membership and owner exclusions.
- `comparison_observations`: dimension, comparable sample, observation date and source-specific expiry; no universal permanent history.
- `recommendations`: rule version, evidence references, action, prerequisites, priority, cost estimate, risk, confidence, expiry, owner decision and suppression reason.
- `recommendation_runs`: input fingerprint, model/rule version, evidence coverage and output deduplication.
- `action_plans`, `action_dependencies`, `action_outcomes`: selected work, prerequisites, execution/measurement states and responsible actor.
- `review_resources`: authorized external reference, source revision, rating/text/reply cache, fetched time and expiry.
- `review_assessments`: ephemeral classifications tied to the source revision; do not use them to evade source storage restrictions.
- `review_reply_drafts`, `reply_approvals`, `reply_attempts`: owner-authored response, source revision hash, consent scope, publication/reconciliation state.
- `review_request_events`: transaction reference, eligibility basis, consent/suppression, delivery state and event deduplication; avoid unnecessary customer data.
- `experiments`: hypothesis, intervention, exposure window, baseline, matching rules, confounders and conclusion confidence.

Store expiring source payloads separately from long-lived owner decisions. A numeric vector, sentiment label or summary derived from restricted content does not automatically escape provider rules. Recommendations expire or lose their evidence links when the underlying data is no longer available. Validate retention and aggregation rights before enabling historical competitor/review dashboards.

### Evidence contract

```json
{
  "subject": "location:example/service:emergency-plumbing",
  "observation": "confirmed service absent from current service page",
  "sourceClass": "owner_facts_and_authorized_site_crawl",
  "observedAt": "2026-10-28T05:00:00Z",
  "coverage": { "pagesChecked": 12, "pagesExpected": 12 },
  "confidence": "high",
  "limitations": ["does not establish Google's ranking cause"],
  "expiresAt": "2026-11-04T05:00:00Z"
}
```

The dates above are illustrative fixture data. Production expiry comes from source policy and freshness configuration.

## 3. Local SEO operating pillars

### A. Accurate business identity

Normalize but preserve original business name, address components, public phone and website. Compare formatting separately from real disagreement: `Road` versus `Rd` need not be an address conflict. Recognize moved locations, departments, practitioners, franchises, hidden-address businesses and genuinely distinct branches. Avoid merging businesses solely by similar names.

The authoritative record contains service availability and exclusions, real-world name, operating/holiday hours, service coverage, booking destination and category evidence. Never invent a physical branch to target a neighborhood. Present identity/category edits as proposals with reasons and owner approval. Google's representation guidance requires accurate real-world business details. [S3]

### B. Search demand and commercial intent

Build keyword families from service, modifier, locality, language and intent: `AC repair`, `AC repair Indiranagar`, `AC repair open Sunday`, `AC repair cost`, and equivalent validated local-language expressions. Distinguish an implied-location query from a query containing a city name.

Use measured demand when available; mark unavailable values as unavailable. Separate branded/nonbranded terms and business-name queries from service discovery. Estimate service relevance from confirmed facts. A high-volume irrelevant keyword is not a useful opportunity.

### C. Geographic visibility

Keep organic website results, Maps grid results, local-pack observations and GBP activity distinct. Track request coordinate, zoom/viewport parameters when applicable, query wording, language, device, depth and provider. Do not equate Maps results with a local-pack position without collecting the relevant result surface.

A heatmap tells where a business appeared in a sample. Compare compatible runs and show error points. Distance is a fundamental factor; poor performance far away does not prove a broken profile. Google's stated factors are relevance, distance and prominence/popularity, not the software's internal health score. [S1]

### D. Helpful website coverage

Map one primary intent to a suitable canonical page. Improve existing pages before generating competing ones. Service pages explain actual service, eligibility, process, coverage, hours, practical next steps and verified proof. Location pages require genuine location/service context and useful differences, not city-name swaps.

Use actual business photos, accessibility information, transport/parking details where relevant, verified case examples and booking links. Do not invent landmarks, work completed, response times, staff credentials or prices. Keep medical/legal/financial claims in a stricter approval workflow.

### E. Reputation and business operations

Reviews inform customer experience and owner action. Detect repeated concerns, create operational tasks and draft appropriate responses. Do not treat keyword-rich replies, posting frequency or image geotags as proven ranking levers. Show a service-quality opportunity separately from a technical SEO problem.

### F. Citations and legitimate authority

Prioritize accurate listings on directories that matter to the selected category/country. Distinguish live verified listings from submitted forms. Compare real identity disagreements; preserve private addresses. Suggest genuine local associations, suppliers, sponsorships or editorial resources with an owner task, without promising paid-link ranking benefits.

### G. Technical accessibility and conversion

Check indexability, correct canonical destination, sitemaps, status codes, internal links, speed samples and usable mobile contact actions. Verify booking/enquiry flow rather than stopping at an SEO score. An authenticated booking tool may need a manual check; a crawler cannot prove a completed appointment.

## 4. Competitor analysis in depth

### 4.1 Discover the right competitors

Use query-cluster and geography-specific competitor sets. A bakery may compete with different businesses for custom cakes and breakfast. Owner-entered competitors are a separate list from businesses repeatedly observed in search results. Directory domains and national publishers may be website-search competitors while not being local service competitors.

Discovery flow: select relevant queries → collect licensed result samples on the owner's chosen grid → extract stable business identities → resolve duplicates/branches → calculate repeated overlap → exclude irrelevant or out-of-area matches → ask owner to confirm ambiguous entities → retain the source and expiry.

Never use owner-authorized GBP account APIs as a general competitor lead-generation database. Competitor observations must come from a source licensed for that purpose. No login-gated scraping or unbounded crawling.

### 4.2 Comparison dimensions

For each dimension show `measured`, `partially observed`, `owner supplied` or `unavailable`:

- Overlap by service/query/location and observed top-3 presence.
- Genuine categories/services/hours where licensed data exists.
- Provider-reported rating/count, date and sampling limitations.
- Review themes from a permitted sample, with sample size and window.
- Existing service/area pages and content usefulness on authorized public pages.
- Visible booking/contact journeys and mobile usability samples.
- Technical page observations and relevant publicly discoverable citations.
- Content update observations only when a reliable date exists; never infer a publishing date from a crawler visit.
- Backlinks only from an appropriate licensed data source; `Domain Rating` is not a Google metric and cannot be fabricated internally.

### 4.3 Explainable competitor opportunity

Do not conclude 'competitor ranks higher because it has more reviews'. That is correlation with many confounders. A good recommendation is: 'Three comparable observed competitors explain emergency availability clearly; your confirmed emergency service is missing from your service page. Improve that page and verify the outcome.'

Opportunity card includes evidence coverage, geography, comparable competitors, exact gap, confidence, estimated effort, action dependencies, owner approval and outcome measurement. Provide at most a manageable shortlist, such as five prioritized actions/week, rather than 100 repetitive suggestions.

### 4.4 Metrics and safeguards

Weighted top-3 coverage = sum of owner-selected keyword weights at successful comparable top-3 points divided by sum of weights at all successful comparable points. Weights express business importance, not Google ranking weight. Show denominator and missing coverage.

Competitor overlap = shared query-point appearances divided by relevant successful query-point samples under an explicit definition. Never label it total market share.

Review comparison uses the same available date window/source where possible. An API exposing only a sample cannot support a claim about all review themes. A sudden increase is an anomaly for investigation, not proof of fake reviews.

## 5. Recommendation engine and controlled execution

Use deterministic detection first, AI explanation second. Detection rules identify a broken booking link, conflicting holiday hours, missing confirmed service page, stale facts in a draft, declining compatible scan coverage, or an unanswered review. AI can group and explain evidence; it cannot invent missing measurements.

Proposed priority, with each input on 0–1 scale:

`priority = 100 × confidence × (0.30 customerImpact + 0.25 businessRelevance + 0.20 observedGap + 0.15 urgency + 0.10 strategicFit) / (1 + 0.5 effort + 0.5 incrementalCost)`

Risk, consent and source validity are hard eligibility gates outside this score. Score is an internal ordering heuristic, not a statistical probability of ranking improvement. Unknown inputs remain visible; avoid mechanically treating missing measurements as zero business value. Store the rule version and reasons.

Dependencies: confirm holiday hours before publishing an opening-hours update; fix robots blockage before creating additional SEO content; resolve location identity before sending review requests; obtain real case-study evidence before generating a case-study page. Collapse duplicate recommendations by location, action target, evidence fingerprint and cooldown.

Action lifecycle: candidate → evidence_ready → proposed → approved/policy_eligible → executing → execution_verified → observing → inconclusive/improved/worsened → retained/rolled_back/closed. Technical publication success is separate from business impact.

Run experiments conservatively. Record other concurrent changes, seasonality, holidays, outages and search updates. Prefer matched day-of-week windows and enough observations; expose uncertainty. A before/after chart does not establish causal lift. No repeated automatic rewriting every time rankings fluctuate.

## 6. Review system: end-to-end workflow

### 6.1 Scope and ingestion

Launch with authorized Google reviews; add other providers only after verifying their current APIs and permissions. Facebook recommendations, Instagram comments, private messages and website feedback are different resource types and must not be presented as interchangeable star reviews.

Use a bounded initial sync with pagination, stable IDs, update timestamps and source expiry. Google documents Cloud Pub/Sub-based notifications for supported profile events; implement authenticated delivery and periodic reconciliation so dropped/out-of-order notifications do not lose work. [S4]

A notification is a signal to refresh the authorized current review, not trusted reply text. Deduplicate by resource/revision. Handle changed ratings/text, removed reviews, existing owner replies, connection loss and deleted accounts. Show freshness and sync health in the UI.

### 6.2 Review inbox

Filters: location, provider, rating, response state, sentiment/topic, risk, language, assignee and age. Separate `unanswered`, `draft`, `needs_approval`, `scheduled`, `sending`, `verified_replied`, `changed_since_review`, `unknown_outcome` and `no_longer_available`.

Drawer: source review, provider link, available public author name, rating, timestamps, existing reply, suggested draft, classification reasons, business facts used, permission status and activity. Redact unnecessary personal data from AI contexts and logs. Never merge anonymous reviewers into a CRM identity by guesswork.

### 6.3 Classification before drafting

Proposed schema: language, star rating, positive/mixed/negative/unclear sentiment, topics, factual questions, privacy indicators, threats/abuse flags, health/legal/safety/refund dispute flags, sarcasm uncertainty, existing-reply state, confidence and recommended handling.

Use text plus rating. A five-star review saying 'Great if you enjoy being scammed' is not a positive auto-reply candidate. A blank rating can receive an owner-approved generic template, but not an invented service-specific response. Review text is untrusted content and cannot authorize tools or override system instructions.

### 6.4 Reply policy modes

Modes: off; draft only; approve each reply; narrowly scoped automatic positive replies. Start every business in draft/review mode. Enabling automatic mode requires a business owner to review sample responses, select location/provider/action, choose eligibility/rate/delay limits and accept a recorded, revocable policy. Verify the actual implementation meets current Google requirements before enabling recurring writes. [S2]

Proposed automatic eligibility requires ALL: currently connected approved capability; specific current consent; unchanged source revision; no existing reply needing protection; 4–5 stars AND clearly positive uncomplicated text; non-sensitive business/context; supported language validated for this tenant; no risk/privacy/uncertainty flags; no promises/compensation; business facts current; spending/rate limits; duplicate and novelty checks passed.

Low confidence, contradictory sentiment, 1–3 stars, complaints at any rating, refund disputes, allegations, emergencies, legal/medical matters and owner-flagged topics go to human review. Star rating alone never permits a public response. Business-specific stricter policies can override the default.

### 6.5 Reply generation

Reply should be brief, natural, relevant, use the business's approved voice and preferably the review's validated language. It may acknowledge the reviewer's actual words without inventing a transaction or repeating sensitive details. Use a public business support contact only when useful. No keyword stuffing, repetitive city/service insertion, promotional deals, requests to remove a negative review or invented refunds.

Examples, all illustrative:

Positive review 'Friendly team and quick repair': 'Thank you for the kind feedback. We’re glad you had a good experience with the team.' Do not add an unverified repair type or timeline.

Mixed review 'Good work but a long wait': draft 'Thank you for your feedback. We’re glad you were pleased with the work, and we’d like to understand the wait you experienced. Please contact our team using the support details on our profile.' Owner checks any operational commitment before posting.

Sensitive complaint: create an internal case and a conservative draft for review. Do not confirm the person is a patient/client, reveal order details, accept legal liability or promise an outcome the system cannot authorize.

### 6.6 Safe delivery and races

Google documents listing/getting reviews and creating/updating/deleting the business's reply; deleting a reply does not delete the customer's review. Verify currently supported permissions and endpoint contracts before production. [S5]

At dispatch: reload policy/connection/current review, compare review and reply hashes, check for a manual provider-side reply, acquire per-review publication lease, and preserve a pending operation ID. If anything changed, pause for re-review. Use local compare-and-swap to coordinate workers; where a provider lacks conditional writes, acknowledge residual external races and minimize the read-to-write interval.

On timeout, fetch the provider reply and compare normalized content before retry. A successful HTTP write is followed by verification. Do not overwrite a different manual reply. Edits, deletion and replacement require explicit control; record what the software changed. Pause/revocation cancels unsent operations immediately.

Suggested initial limits: configurable 5–15 minute owner-edit window, maximum five automatic replies/day/location, digest of actions and a one-click pause. These are product defaults, not provider rules. An edit window prevents some mistakes; it does not replace consent.

### 6.7 Quality evaluation and rollout

Create at least 60 labeled review examples: praise, rating-only, mixed, sarcastic, multilingual/code-switched, competitor allegations, personal data, refund, health/safety, threatening, edited review, removed review, existing reply and prompt injection. Critical criterion: no sensitive/complaint case should be auto-published in the acceptance set. Zero errors on the test set is not a production guarantee; start with shadow mode and monitor real owner corrections.

Rollout: draft-only → 20 owner-reviewed replies → shadow eligibility decisions → opt-in limited auto mode → periodic sampling and policy review. Keep provider approval/retention dependencies visible. Do not silently enable automation after a subscription upgrade.

## 7. Review acquisition and service recovery

Offer a neutral Google review link/QR and optional transaction-triggered invitations. Apply the same objective eligibility rules regardless of expected satisfaction. Separate private service feedback from the public review link without routing only happy customers to Google. No rewards, fabricated reviews or pressure for specific text. [S6]

Eligibility examples: genuine completed service, valid contact/consent, not opted out, not a duplicate transaction, reasonable frequency cap. Define how cancelled/refunded transactions are treated by objective rules rather than selectively suppressing unhappy customers. Keep logs proving the rule applied uniformly.

Delivery adapters are disabled until the business authorizes the channel and the launch market's requirements are checked. Do not infer outreach permission from a public review or an imported phone number. Implement opt-out/suppression, idempotency, quiet hours and limited reminders. Customer-created reviews cannot be automatically linked back to a particular invitation unless the provider supplies a valid permitted basis; report clicks separately from verified new reviews.

Service recovery queue: recognize an operational issue, assign owner, record internal follow-up and mark resolved only on owner evidence. Do not ask for a better rating as a condition of resolving a complaint. Suspected policy violations generate an evidence packet and provider-reporting guidance, never a promised removal service.

## 8. Review analytics with honest methodology

Metrics: current provider rating/count, current unanswered count, response coverage in the accessible set, median response time for known events, owner edit/approval rate, automatic eligibility/rejection reasons, delivery/verification failures and permitted theme samples. Show sample sizes and unavailable timestamps.

Do not present sampled-review averages as the platform's official overall rating. Avoid long-term derived GBP review trends unless retention/aggregation use has been cleared. Expose the selected allowed observation window and its limitations.

An optional private arithmetic simulator can explain averages using owner-provided aggregate values: current average R across N reviews plus x hypothetical reviews at score s gives (R×N+s×x)/(N+x). Mark as mathematical illustration, not a target, prediction, invitation selection rule or instruction to obtain only high ratings. Do not derive a precise original star sum from a rounded public average.

Review insight example: 'Wait time appears in 7 of 24 accessible reviews in this window; owner review suggested.' This is a sample observation, not a claim about every customer or causal ranking explanation. A suspicious spike is flagged as an anomaly, not an accusation of fraud.

## 9. Website, schema and content additions

Add service/area coverage matrix, useful local content briefs, internal-link opportunities and crawl-diff detection. Verify visible page content agrees with generated JSON-LD. Use a stable entity @id, appropriate business subtype, accurate hours/contact details and verified links. Schema validity does not guarantee rich results. [S7]

Do not expose a hidden residential address simply to satisfy rich-result requirements. Keep honest public information; if required properties cannot appropriately be published, explain reduced eligibility rather than fabricating data.

Displaying a testimonial widget does not make a business eligible for self-serving review stars in Google Search. Keep testimonial display, rights/source requirements and review-rich-result eligibility separate. [S8]

Business updates should use confirmed photos/offers/events. Expire stale offers and show rejected posts as rejected. Maintain a calendar with campaign intent and channel variants, not forced daily posts with repeated generic text.

## 10. Operational schedules and cost controls

Proposed defaults, adjusted for volume and source terms:

- Review notifications: event-driven with bounded reconciliation; do not promise instant delivery.
- Review drafts: after a valid new/changed review; deduplicate by source revision.
- Facts/hours conflicts: lightweight daily checks where permitted; ask owner before changes.
- Rank scans: weekly small-grid baseline; owner estimates cost before extra scans.
- Competitor refresh: weekly sampled metrics, monthly broader page-gap analysis where licensed.
- Crawl: weekly bounded crawl plus checks after a published technical fix.
- Recommendations: weekly shortlist and event-driven urgent technical/customer issues; suppress duplicates.
- Content planning: monthly plan, weekly adjustment; no mass churn from daily rank noise.
- Retention cleanup: daily or more frequently to meet source expiry.
- Provider capability/policy audit: recurring owned engineering task before version deadlines.

Add unit budgets for review assessment/drafting, competitor evidence collection and AI explanations to the existing ledger. High-volume reviews and third-party review analysis can cost more than ordinary text generation because of data collection and support. Use cached lawful evidence, bounded samples and no paid model call when a deterministic rule suffices. New modules increase scope beyond the original basic beta; schedule 3–6 additional focused weeks for intelligence/reputation hardening, adjusted after spikes, without treating this as an approval-time guarantee.

## 11. Example owner journey

An AC service business in Bengaluru connects WordPress and an authorized GBP, confirms a hidden address, service coverage, Sunday hours and public contact. The baseline finds weak sampled visibility for repair queries in one nearby cluster. Competitor research identifies missing repair-cost/process information on the existing service page, not a need for 30 new city pages.

The weekly shortlist proposes: repair a broken booking link; clarify confirmed Sunday availability; expand the repair page with grounded FAQs; review two unanswered complaints; prepare one genuine local-directory correction. It prioritizes the broken customer journey over more articles.

The owner approves page changes and review drafts. Straightforward positive reviews remain in shadow mode until explicit opt-in. One five-star sarcastic complaint is held. The software verifies published HTML and replies, logs spend, and measures later search/enquiry observations without claiming a guaranteed ranking lift.

## 12. Acceptance conditions

Competitor comparisons share defined surfaces/geography/time windows or disclose differences; unavailable data is never invented. Every recommendation links to valid evidence, explains confidence, has a bounded next step and respects source expiry. Review automation cannot run on rating alone, stale consent, edited source, existing manual reply, sensitive content or an unsupported language. Duplicate/replayed events and ambiguous external outcomes do not cause blind reposts. Review acquisition is neutral and permission-aware. UI retains the existing light-orange design system and clearly distinguishes drafts, proposals, scheduled actions and verified public changes.

## Sources checked 28 October 2026

[S1] https://support.google.com/business/answer/7091?hl=en
[S2] https://developers.google.com/my-business/content/policies
[S3] https://support.google.com/business/answer/3038177?hl=en
[S4] https://developers.google.com/my-business/content/notification-setup
[S5] https://developers.google.com/my-business/content/review-data
[S6] https://support.google.com/contributionpolicy/answer/7400114?hl=en and https://support.google.com/business/answer/3474122?hl=en
[S7] https://developers.google.com/search/docs/appearance/structured-data/local-business
[S8] https://developers.google.com/search/docs/appearance/structured-data/review-snippet

Sources establish platform behavior/boundaries; module designs, thresholds, formulas and proposed schedules are this blueprint's recommendations.
