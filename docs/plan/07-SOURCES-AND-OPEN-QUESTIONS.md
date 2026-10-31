# Research evidence, sources and decisions to revisit

Research date: 27 October 2026, user timezone Asia/Kolkata. Public web sources can change. Verify prices, policies, endpoint availability and installed SDK versions again at implementation and before launch.

## 1. Evidence standard

**Observed:** public website content, public documentation, actual homepage screenshot and browser-computed styles.

**Advertised:** pricing, performance claims, integrations and customer examples described by Outrank. Feature advertising was not treated as independent proof of effectiveness.

**Proposed:** LocalPilot's architecture, database, quotas, dashboard layout, schedule, cost envelopes, product priorities and acceptance tests.

**Unverified:** Outrank's private application screens and implementation; production account access to GBP/Meta; the new product's future costs, quality, ranking improvements and scale capacity.

## 2. Outrank source register

| Source | Used for |
|---|---|
| [Homepage](https://www.outrank.so/) | Product positioning and public feature overview; desktop visual reference |
| [Pricing](https://www.outrank.so/pricing) | Advertised core subscription and add-on structure |
| [Sign-in](https://www.outrank.so/signin) | Public authentication entry; authenticated app boundary |
| [Integrations](https://www.outrank.so/integrations) | Advertised publishing destinations |
| [WordPress documentation](https://www.outrank.so/docs/wordpress) | Public integration instructions |
| [Article improvements](https://www.outrank.so/docs/improvements) | Public rewrite/republish workflow |
| [REST API](https://www.outrank.so/docs/api) | Organization-scoped API and documented product resources |
| [Free blog product](https://www.outrank.so/free-blog) | Hosted-blog offering and own-domain concept |
| [AI visibility](https://www.outrank.so/ai-visibility) | Advertised AI-citation positioning |

The public sign-in page was read, but no sign-in, subscription or private-dashboard inspection was performed. No private competitor data or source code was accessed.

## 3. Platform and technical source register

| Source | Implementation check |
|---|---|
| [GBP prerequisites](https://developers.google.com/my-business/content/prereqs) | Project eligibility/access application |
| [GBP setup](https://developers.google.com/my-business/content/basic-setup) | Approved project setup |
| [GBP API policies](https://developers.google.com/my-business/content/policies) | Integration consent, access and source-data obligations |
| [GBP REST reference](https://developers.google.com/my-business/reference/rest) | Endpoint discovery; verify actual supported versions |
| [GBP Performance API](https://developers.google.com/my-business/reference/performance/rest) | Available business-profile measurements |
| [Google local ranking](https://support.google.com/business/answer/7091?hl=en) | Honest ranking interpretation |
| [GSC Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) | Observed search data, dimensions and limitations |
| [Robots introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro) | Correct crawler controls |
| [Noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) | Correct exclusion mechanisms |
| [Indexing API](https://developers.google.com/search/apis/indexing-api/v3/using-api) | Avoid unsupported general-blog submissions |
| [Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies) | Content/link/doorway guardrails |
| [Meta Instagram documentation on Postman](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) | Meta-maintained primary collection and login-route distinction |
| [Instagram Login documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login) | Must recheck during integration spike |
| [Instagram publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing) | Must recheck currently supported publishing contract |
| [Facebook Pages posts](https://developers.facebook.com/docs/pages-api/posts/) | Must recheck current permissions and post endpoints |
| [DataForSEO Maps task posting](https://docs.dataforseo.com/v3/serp/google/maps/task_post/) | Coordinate/task configuration spike |
| [Maps pricing](https://dataforseo.com/pricing/google-serp/google-maps-serp-api) | Base mode pricing and multipliers |
| [SEO provider minimum payment](https://dataforseo.com/help-center/minimum-payment) | Initial prepaid cash requirement |
| [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) | Text/image model cost reference |
| [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation) | Illustrative SDK utility and image workflow |
| [Supabase pricing](https://supabase.com/pricing) | Managed database/auth reference |
| [Hetzner price notice](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) | VM cost reference, region/IPv4/tax caveats |
| [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | Storage and operation reference |
| [Antigravity rules](https://www.antigravity.google/docs/rules/) | Persistent implementation constraints |
| [Antigravity workflow documentation](https://antigravity.google/docs/ide/workflows/) | Avoid reliance on stale workflow instructions |

Direct Meta developer pages returned rate-limit/access errors during this research. The primary Meta-maintained Postman collection supplied partial confirmation; exact app-review requirements, API version, permission dependency chains and enabled formats remain explicit Phase 0 verification tasks. Third-party guides were not used as authority for those contracts.

## 4. Visual evidence

Captured public homepage: [1440×1000 screenshot](evidence/outrank-home-desktop.png).

Computed-style observations are recorded in the UI specification. Measurements were taken from visible DOM elements, rather than guessed solely from the screenshot. No mobile breakpoint measurements or private dashboard measurements are claimed. Later implementation should recheck mobile layouts directly or use authorized references.

## 5. Decisions needing owner validation, without blocking this plan

| Decision | Assumption used | When to resolve |
|---|---|---|
| Launch geography | India-first, globally capable model | Before provider/payment registration |
| Business category | Single-location service businesses | Before pilot recruitment |
| Brand/domain | LocalPilot placeholder | Before public marketing launch |
| Existing code reuse | New repository; avoid altering outbound system | Before scaffold |
| Owner budget | Low fixed cost with metered providers | Before purchasing services |
| Primary CMS | WordPress plus hosted templates | Phase 0 owner interviews |
| Model choice | Economy model with evaluation-based escalation | Before production content |
| Publishing consent | Review-first; scoped policies only after validation | Before external writes |
| Directory coverage | Small relevant country/category catalog | Before citation sales claims |
| Historical GBP reporting | Gated pending permitted retention/use validation | Before storing long-term profile history |
| Agency workflows | Deferred UI, tenancy-ready backend | After paid single-location validation |
| Customer pricing | Proposed test tiers | After willingness-to-pay interviews |

## 6. Definition of this handoff being ready

The planning handoff is ready when the builder can identify what is verified, what is proposed, what to build first, the exact key domain boundaries, how publishing avoids duplicates, how costs are bounded, what each screen should show, and what evidence closes each phase.

The SaaS itself is ready only after those implementation acceptance gates pass. A plan, mockup or generated scaffold does not establish production readiness.
