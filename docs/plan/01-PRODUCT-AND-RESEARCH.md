# Product definition and Outrank analysis

## 1. What to build

LocalPilot is a multi-tenant SaaS that takes a local business from fragmented online accounts to a consistent, measurable marketing workflow. An owner supplies a URL or business details, confirms facts, connects accounts, chooses a goal and spend limit, reviews a month of planned activity, and approves an automation policy. The product then generates, schedules, publishes, checks outcomes, and proposes improvements.

The main product outcome is **qualified enquiries and a maintained local presence**. Published-content counts and internal health scores are operational metrics. They must not be represented as proof of ranking improvements.

Initial assumptions: India-first; English first, Hindi after quality validation; one location per starter subscription; agencies later; existing WordPress sites plus a template-based hosted site. Preserve country, currency, IANA timezone, language, address format, phone format, and tax configuration in the model from the start.

The cheapest useful product is not daily AI articles plus unlimited integrations. It is one accurate business record, a useful calendar, reliable publication to a small number of channels, weekly visibility measurement, and clear owner actions when automation is blocked.

## 2. What was verified about Outrank

These are advertised/publicly documented capabilities, not independent validation of SEO outcomes.

| Area | Public evidence | LocalPilot adaptation |
|---|---|---|
| Research and planning | Niche/competitor keyword discovery and calendar planning | Service × locality × intent clusters; confirmed service coverage |
| Content | Articles, brand voice, AI images, editing and previews | Local expertise, real photos, service FAQs, seasonal offers |
| Scheduling | Configurable publishing cadence | Separate blog, GBP, Instagram, Facebook cadence |
| Authority | Advertised backlink placements | Citation consistency and genuine local opportunities first |
| Team operations | Multiple sites and collaborators | Organization → business → location hierarchy |
| AI visibility | Public marketing around citations in AI answers | Optional sampled experiments later; no guaranteed AI recommendations |

Source: [Outrank public homepage](https://www.outrank.so/). Its outcome claims and testimonials are vendor claims.

| Additional area | Verified detail | Build implication |
|---|---|---|
| Pricing | Core plan advertised at $99/month or $999/year, with 30 articles and publishing; add-ons exist | Do not copy an unlimited cost structure; use explicit local quotas |
| CMS coverage | WordPress, Ghost, Webflow, Notion, Wix, Shopify, WordPress.com, webhook, Framer, Next.js | Start with WordPress and hosted renderer; standard adapter contract for expansion |
| Improvements | Uses GSC to find rewrite opportunities; review or automatic republishing | Preserve external IDs, revisions, links, slugs, and owner edits |
| Hosted blogs | Public free-blog offering with own-domain support and server-rendered content | Offer a hosted starter site; domain ownership and hosting are separate |
| Agent API | Organization-scoped bearer keys; products, keywords and articles | Defer external agent API until internal permissions and quotas are proven |

Sources: [pricing](https://www.outrank.so/pricing), [integrations](https://www.outrank.so/integrations), [improvements](https://www.outrank.so/docs/improvements), [hosted blogs](https://www.outrank.so/free-blog), [REST API](https://www.outrank.so/docs/api).

### What cannot be claimed from this research

- Complete private navigation, dashboard table behavior, settings, and billing flows were not inspected.
- Outrank's database, AI vendors, queues, prompts, and infrastructure were not verified.
- Its marketing performance claims do not establish what another product will achieve.
- The public pages reviewed do not establish a complete native GBP/local-grid/social/citation product. Those are proposed additions here, not verified missing features across its private product.

## 3. Local SEO requires a different product model

Keep four measurements separate:

1. **Website search performance:** GSC clicks, impressions, CTR, average position by available query/page/device/country. This is observed search analytics, not an exact coordinate-based local rank.
2. **Google Maps visibility:** a sampled rank for a keyword at a defined coordinate, language, device, time, and result depth. There is no single universal business rank.
3. **Business Profile performance:** the metrics exposed by the current GBP Performance API. A website click or call-button interaction is not automatically a verified lead or completed call.
4. **Conversions:** hosted-form enquiries, owner-confirmed leads, and optionally analytics events. Do not add clicks, directions, and enquiries into a misleading total.

Google describes local ranking through relevance, distance, and prominence/popularity; a product cannot purchase or guarantee a better local rank. Show the factors the software can influence and the measurements it actually has. [Google local ranking guidance](https://support.google.com/business/answer/7091?hl=en).

## 4. Automation feasibility and boundaries

| Task | Practical automation | Boundary and product behavior |
|---|---|---|
| Import business facts | Crawl authorized public site and import user data | Owner confirms conflicts before facts become authoritative |
| Build website | Generate structured sections from confirmed facts | Owner supplies domain/DNS access and publishes first version |
| Connect GBP | OAuth + list authorized locations | API project approval, owner access, and eligibility required |
| Create/verify GBP | Guided setup and supported API steps where available | Owner action required; no automatic bypass of verification |
| GBP posts | Queue supported post types for eligible locations | Respect category restrictions, express consent, API availability |
| GBP identity edits | Generate before/after proposal | Explicit approval per sensitive change; no automatic name stuffing |
| GBP review replies | Draft from current authorized data | Consent required; negative/sensitive replies always reviewed |
| Instagram publishing | Supported professional-account media via approved integration | Personal accounts unsupported; conversion/reconnect guidance |
| Facebook publishing | Authorized business Pages | Personal-profile posting is outside the scope |
| Blog publishing | WordPress connector or hosted renderer | CMS permissions and ownership required |
| robots.txt fixes | Full control on hosted sites; signed plugin support on WordPress | External CMS may only allow recommendations or export |
| Citation submissions | Directory API/partner where available; prepared submission packets elsewhere | Directory ownership, OTP, moderation, and payment can need owner work |
| Rankings | Paid SERP provider and geo-grid sampling | Meter usage; disclose freshness, depth, failed points |
| Indexing | Sitemap, internal linking, indexing diagnostics | No guaranteed Google inclusion or instant index button |
| AI visibility | Repeatable sampled prompts through named providers | API responses are not identical to consumer app recommendations |

GBP API access is an early launch dependency: Google's current prerequisites include an active, verified profile managed for 60+ days and a representing website. Start the access request before building the whole integration. [GBP prerequisites](https://developers.google.com/my-business/content/prereqs).

GBP-specific consent, storage and downstream access rules shape implementation: do not expose the platform's Google project as a generic scripting proxy; preserve specific express consent; make disconnection easy; build a source-specific retention policy. Treat ambiguity about recurring action consent or data retention as a release gate for that feature. [GBP API policies](https://developers.google.com/my-business/content/policies).

Instagram has distinct Instagram Login and Facebook Login products. The Facebook Login route requires a linked Page; the Instagram Login route must be validated separately. Select one route per adapter and never mix its scope names or tokens. Public SaaS access depends on the permissions approved for that app. [Meta-maintained Instagram collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api). Direct Meta documentation was rate-limited during research, so exact permission/version checks remain a Phase 0 task.

## 5. Product modules and requirements

### 5.1 Business setup and source of truth

Required fields: legal/display business name, category, services, country, public or hidden address mode, service area, phone, website, hours, timezone, booking/contact destination, owner contact. Optional fields: pricing bands, credentials, team, languages, brand voice, approved offers, real photos, service exclusions and prohibited claims.

Each fact needs a provenance record: source type, URL or user input, captured time, confidence, verification status, owner confirmation time, and applicable location. Example conflict: site says 9am opening, GBP says 10am. Show both and ask the owner to resolve it; do not silently overwrite GBP.

Maintain versions. A new phone number invalidates future content variants containing the old number. Content already published is placed in a reviewable correction queue. A business with a hidden service-area address must not have its private address inserted into generated pages or public structured data.

### 5.2 Onboarding flow

1. Google/email sign-in and organization creation.
2. Choose existing website, existing GBP, or starting from scratch.
3. Import optional website details and connect accounts independently.
4. Select one business/location; avoid accidentally connecting every location in an account.
5. Confirm facts, photos, target area, services, voice and conversion goal.
6. Show initial site audit and a rank scan estimate before spending credits.
7. Generate a 30-day proposed plan; let the owner remove topics and offers.
8. Configure review-first mode; offer channel-specific automation after first successful publication.
9. Start baseline jobs asynchronously and show resumable progress.

Each integration can be skipped. A GBP-only business can still use planning and GBP publication while creating a website. A website-only business can use blogs and GSC. Show which capabilities are available, blocked, unapproved, disconnected, and unsupported.

Activation target: confirmed facts, one connected or hosted destination, baseline requested, one content item approved, and automation policy selected. Measure actual time; target under 15 minutes excluding verification/DNS wait.

### 5.3 Local keyword research and strategy

Inputs: services, accepted locations, seasonality, customer questions, existing pages, actual GSC queries, and measured competitor samples. Distinguish provider-supplied volume from AI-suggested topics. Never invent volume or difficulty values.

Cluster by intent: immediate service demand, service comparison, price explanation, maintenance/advice, local proof, and booking FAQs. Map each cluster to an existing or proposed canonical URL. Detect cannibalization before creating a new blog or service page.

Use a transparent prioritization heuristic: relevance 35%, conversion fit 25%, current visibility gap 20%, competition opportunity 10%, seasonality 10%. This is an internal planning score, not a Google metric. Label missing inputs and renormalize only after explaining which fields are excluded.

Initial cadence: 4–8 useful blogs/month and 8–12 campaign ideas; derive channel variants from those ideas plus genuine business updates. Adjust to the business; do not generate 30 thin articles merely to fill dates.

### 5.4 Content studio

Pipeline: brief → outline → draft → facts/claims validation → assets → channel variants → deterministic checks → review/approval → scheduled publication → reconciliation.

Editor must support headings, links, images, alt text, lists, excerpts, title/meta, canonical URL, slug, channel preview, revision history and restore. An AI edit creates a new revision and shows a diff. Publishing freezes a revision; later edits invalidate its approval until reviewed or covered by an eligible policy.

Content model: one campaign idea can produce a blog, a concise GBP update, an Instagram image/caption, and a Facebook post. Each is independently editable and independently succeeds/fails. A campaign does not need a blog to exist. For a blog-derived campaign, wait for the verified published URL before finalizing link variants.

Quality rules: grounded service availability and hours; no invented local projects, reviews, staff or certifications; no fabricated pricing; no unsupported superiority claims; no fake before/after images. AI-generated graphics can illustrate a topic, while real-business portfolio posts use approved real photos.

### 5.5 Calendar and automation center

Month/week/list calendar; filters for location, channel, status and owner. Drag/reschedule changes due time and recalculates approvals if payload changes. Local timezone shown prominently. Include blackout dates, holidays, quiet periods, duplicate-topic detection, collision checks, quotas, and an immediate pause button.

Automation policies are versioned per location/channel/action. Example: publish approved seasonal maintenance tips twice weekly, at most eight monthly, using approved services/photos and a set spend cap. Policy excludes offers with new prices and sensitive claims. Record scope, cadence, allowed categories, approving user, consent text, timestamps and revocation.

Do not treat one generic signup checkbox as permission for all account edits. Default recurring GBP behavior to review until the integration owner verifies that the implemented consent flow meets Google's current requirements.

### 5.6 Rankings and competitors

Start with five keywords, a 3×3 grid, weekly scans, top-20 display depth, and provider configuration verified in a technical spike. A point stores coordinate, request parameters, status, observed rank or not-found-within-depth, timestamp and source.

Competitors are recognized by stable identifiers where provided, rather than name alone. Owner confirms ambiguous target matches. Keep business listings from competitor/SERP providers separated from owner-authorized GBP account data.

Show grid, top-3 coverage, per-keyword history, and competitor share across the same successful points. Definitions and censoring are in the architecture document. Do not compare scans with different grid footprints as if they were equivalent.

### 5.7 Technical website SEO

Audit HTML status, indexability, canonical links, robots, sitemap contents, title/meta, headings, broken links, internal links, mobile usability, structured data, image size, and performance samples. An internal score must have inspectable weighted checks, not an unexplained AI number.

Hosted sites can receive validated automatic fixes within policy. External sites receive a patch proposal, plugin-supported change, or manual instructions. Preview → approval → snapshot → publish → verify → rollback is mandatory for robots, redirects, canonical and site-wide indexing changes.

robots.txt controls crawler access; it is not a reliable removal mechanism or security boundary. Google does not support `noindex` inside robots.txt. Use supported tags/headers and allow crawlers to read them where appropriate. [robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro), [noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Ordinary blogs/service pages should use sitemaps and useful internal links. Google's Indexing API is restricted to supported job-posting/live-stream pages. [Indexing API scope](https://developers.google.com/search/apis/indexing-api/v3/using-api).

### 5.8 Website creation

Three templates initially: service professional, appointment business, and local storefront. Structured blocks: hero, services, service detail, about, team, gallery, verified testimonials, FAQs, contact, hours, location/service area, booking link, blog, privacy/contact disclosures.

Owner can edit text, reorder permitted blocks, choose approved imagery and theme, and preview mobile. Hosting supports platform subdomain first, then verified custom domain and managed HTTPS. A domain is bought from a registrar; 'custom domain included' means connection support unless domain registration is explicitly sold.

Avoid a freeform page builder, ecommerce, complex booking engine, or arbitrary tenant JavaScript in the first release. Link existing booking tools. Contact forms need abuse limits, honeypots, optional challenge, delivery status and lead export.

### 5.9 Citations and reputation

Separate a citation (business listing/name-address-phone mention) from a backlink and from an AI citation. Use an authoritative NAP record, country/category-specific directory catalog, claimed status, field comparison, evidence URL, last checked time and owner task.

Statuses: discovered → mismatch/missing → prepared → owner verification → submitted → live verified → update required/rejected. Submitted never means live. Verification checks business identity and fields, with uncertain matches assigned for review.

Begin with 10–20 relevant directories for the target country/vertical, not '100 guaranteed submissions'. Each directory records supported method, permitted automation, fee, credentials/ownership requirements, and update/delete process. Directory APIs or a fulfillment partner come later; do not build CAPTCHA bypasses.

Review features: unified current inbox, AI drafts, owner approval, reply status, neutral review-request link/QR, opt-out handling. Do not generate customer reviews or selectively request reviews only from happy customers. Customer outreach by email/SMS requires a separate product consent and legal review for the launch market.

### 5.10 Reporting, billing, and agency expansion

Owner dashboard shows completed work, pending actions, actual measured visibility, enquiries, and cost/usage. Reports compare matched periods, use source-specific dates, show missing data, and distinguish correlation from attribution.

Pricing is per active location with included quotas. Billing includes subscription state, grace period, credit ledger, prepaid overages, invoices and cancellation. Cancellation pauses future paid actions, preserves agreed read/export access, and does not delete an owner website without a clear hosting policy and notice.

Agency release adds location groups, delegated roles, approval ownership, white-label report styling, bulk actions with per-location results, and account isolation. The tenancy model supports this from day one; the agency interface is deferred.

## 6. Priorities

| Release | Include |
|---|---|
| Prototype | Orange UI, onboarding, dashboard, calendar, editor, ranking fixtures; clearly labeled demo data |
| Private alpha | Real auth, facts, WordPress publication, durable jobs, generation, basic metering, internal adapter tests |
| Paid beta | Hosted sites, real rankings, GSC, approved GBP/Meta capabilities, audit, basic citations, billing, recovery and support tools |
| Growth | Citation partner, review workflows, content refreshes, multilingual validation, more templates and CMS adapters |
| Agency | Multi-location bulk workflows, branded reports, advanced roles and cost allocation |
| Optional later | Sampled AI visibility, free tools builder, video, custom agent API |

Do not recreate a backlink exchange as a launch shortcut. Prioritize accurate listings, business relationships and useful local resources. Google's spam rules cover link manipulation, doorway pages and low-value scaled content. [Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

## 7. Success measurements

Track activation rate, time to first verified publish, integration success/reconnect rates, percentage of jobs completed without owner repair, review workload, content approval rate, per-location variable cost, support time, retained paid locations and owner-confirmed enquiries.

Suggested beta gates: 10 pilot locations, 3 business categories tested, 2 weeks of scheduled publication with no duplicate external posts, all tenant-isolation tests passing, successful backup restoration, understandable failure states, and demonstrated owner value. Ranking growth is observed over appropriate periods; never use it as a guaranteed engineering acceptance condition.
