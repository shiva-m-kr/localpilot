# Costs, operating limits and unit economics

Checked 27 October 2026. All estimates in USD unless marked EUR. Exclude taxes, foreign-exchange spreads, labor, payment fees, registrar domains, paid directory/partner work and optional messaging/video. Do not convert USD to INR using an invented current exchange rate; convert at purchase or use a finance-supplied budgeting rate.

## 1. What 'cheapest' should mean

Minimize total operating effort and cost per retained customer, not the number of free-tier logos. A slightly more expensive managed database can cost less overall than outages and recovery work. There is no verified universal cheapest provider for every region/workload; this is a low-cost reference design based on checked inputs and stated allowances.

Use free services for a prototype, paid predictable foundations for paying customers, and meter every external cost. Do not rely on consumer Gemini/Antigravity subscriptions covering production API usage. Development-assistant fees are a separate budget.

## 2. Verified reference prices

| Component | Checked price input | Application |
|---|---|---|
| Supabase Pro | From $25/month, base compute credit structure applies | Auth/Postgres reference; additional projects/compute add cost |
| Hetzner CX23 Europe | €5.49/month excluding IPv4 and VAT | Small pilot reference, subject to availability |
| Hetzner CX33 Europe | €8.49/month excluding IPv4 and VAT | More RAM for web/worker; check current capacity/region |
| R2 standard storage | $0.015/GB-month beyond allowance; operation charges apply | Media/storage, not an unlimited free CDN promise |
| DataForSEO Maps Standard | $0.0006 per SERP up to 100 results in the quoted base mode | Scheduled low-cost grid scans |
| Maps Priority / Live | $0.0012 / $0.002 base per SERP | Faster scans only when justified |
| DataForSEO prepaid minimum | $50 top-up; unused balance persists | Cash-flow requirement, not a recurring $50 usage fee |
| Gemini 3.1 Flash-Lite text | $0.25 input / $1.50 output per million tokens standard | Economy text evaluation candidate |
| Gemini 3.1 Flash Lite Image | $0.0336 per 1K image standard; $0.0168 batch equivalent | Economy image reference, plus applicable inputs |

Sources: [Supabase](https://supabase.com/pricing), [Hetzner price notice](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [R2](https://developers.cloudflare.com/r2/pricing/), [Maps pricing](https://dataforseo.com/pricing/google-serp/google-maps-serp-api), [minimum top-up](https://dataforseo.com/help-center/minimum-payment), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

Verify the chosen model is available in the production account and region. Price tables do not prove it meets content quality or throughput needs. Current docs show the old `gemini-2.5-flash-image` retirement date has passed; do not build on copied old examples using it.

The SEO provider's base Maps pricing is not the price of every other endpoint. Organic rank, keyword research, review/listing data and technical crawls have different billing. Parameter multipliers, requested depth and retries can change cost. Record the provider-reported cost after each task.

## 3. Ranking arithmetic

```text
monthly Maps requests = locations × keywords × grid points × scans/month
base Maps cost = requests × mode price × applicable multipliers
```

These examples use four scans/month for easy budgeting; a weekly annual schedule averages 4.33, so budget approximately 8.3% more if running every week. They exclude failures/retries, extra result depth and other endpoints.

| Tier example per location | Requests / 4-scan month | Standard base | Live base |
|---|---:|---:|---:|
| 5 keywords × 3×3 × 4 | 180 | $0.108 | $0.36 |
| 10 keywords × 5×5 × 4 | 1,000 | $0.60 | $2.00 |
| 20 keywords × 7×7 × 4 | 3,920 | $2.352 | $7.84 |
| 20 keywords × 7×7 × 30 daily | 29,400 | $17.64 | $58.80 |

At 100 locations, the final daily Live example costs $5,880/month in base Maps requests alone. Unlimited daily large grids can destroy an inexpensive subscription's margin.

A provider response may expose more result depth than the product displays. Store actual request configuration, chosen display threshold and billing separately. Multiple competitors from the same query can often be analyzed from one licensed response; don't issue identical paid queries once per competitor. Confirm the provider permits intended reuse/retention.

## 4. Text and image calculation

Illustrative eight-article monthly workflow, counting all drafting/checking/repurposing calls together:

```text
input = 200,000 tokens / month / location
output including billable thinking = 100,000 tokens
economy text base = 0.2 × $0.25 + 0.1 × $1.50 = $0.20
16 new 1K economy images = 16 × $0.0336 = $0.5376
```

This is a narrow inference-cost illustration, not a total content bill or a quality guarantee. Retrieval, grounding/search queries, quality-model escalation, rejected attempts, edits, image inputs and human review add cost. Budget **$1–4/location/month for text** and **$0.50–2 for limited images** initially, then replace estimates with observed p50/p95 cost per approved campaign. A premium model/content cadence can exceed those allowances.

Real owner photos and reusable branded templates are cheaper and often more credible than generating new photos for every post. Derive 1:1, 4:5 and 16:9 crops through deterministic image transforms. Add text/logo overlays with a renderer, not a new generation call. Never label a generated sample as a photo of completed customer work.

## 5. Reference monthly operating budgets

### Prototype, no live customers

Local web/database plus free development services and a small paid API allowance: **$0–25 usage/month** is plausible for limited demos. If paid SEO testing exceeds the trial credit, the $50 minimum top-up affects first cash outlay. This stage has no production reliability promise and is not a valid cost model for hundreds of active users.

### Recommended managed pilot: ten active locations

| Line | Planning amount/month | Basis |
|---|---:|---|
| Managed auth/Postgres | $25 | Base plan reference; one production project |
| Web + worker VM | $12–20 | Budget allowance, not an exact regional quote |
| Backup/storage/email/monitoring | $8–15 | Allowance; verify chosen vendors and staging plan |
| Text/image/search/rank usage | $30–60 | 10 × $3–6 per location under bounded cadence |
| Subtotal | $75–120 | Sum above |
| 15–25% contingency | $11–30 | Retries, early inefficiency, limited headroom |
| Rounded planning envelope | **$85–150** | Excludes listed non-operating items |

If staging uses another paid managed project or runs continuously, add its actual cost. Do not hide it inside the base plan. First-month cash may exceed expense because unused prepaid SEO credit is an asset balance.

### 100 active locations

Infrastructure/supporting services allowance $70–140 plus $300–600 metered usage; 15% contingency gives approximately **$425–850/month**. This assumes the same limited content/grid cadence. Premium directory fulfillment, daily large scans, frequent grounding and human editing are additional.

### 1,000 active locations

Infrastructure allowance $250–700 plus $3,000–6,000 usage; 15% contingency gives approximately **$3,750–7,700/month**. This is a scenario, not a load-tested capacity claim. Database history, provider throughput, support staffing and retention can dominate at this scale.

### Cheapest cash alternative

Self-host database/web/worker on a VM, with encrypted off-site backups, object storage and transactional email. For a small pilot, estimate $20–45 shared infrastructure plus usage and contingency. Relative savings are roughly the removed managed bill, not free operations. Someone must own OS/database patching, certificate/secret rotation, backup validation, restore and incident response. Use this route only when that work is realistic.

## 6. Proposed commercial packaging

These are test prices, not observed market willingness to pay. Validate with pilot owners before promising a permanent price.

| Included per active location/month | Starter $29 | Growth $59 | Pro $99 |
|---|---:|---:|---:|
| Blogs | 4 | 8 | 12 |
| Campaign ideas | 8 | 12 | 20 |
| Supported channel publication attempts | 24 | 48 | 80 |
| New AI images | 8 | 16 | 24 |
| Tracked keywords | 5 | 10 | 20 |
| Grid / included scheduled scans | 3×3 / 4 | 5×5 / 4 | 5×5 / 4 |
| Maps point allowance | 180 | 1,000 | 2,000 |
| Hosted site | 1 basic | 1 | 1 with expanded templates |
| Citation checks/tasks | Basic | Expanded | Expanded |

A campaign may generate multiple variants, but the publication cap is an aggregate across connected channels. Word quota definitions carefully: automatic retries are costed internally; customer charging for failed attempts must be explicit and fair. Paid directory fees, registrar domain registration, messaging, large-grid packs, extra manual scans and human editing are separate. Do not sell features before provider approval.

Offer a bounded preview trial, not unlimited anonymous generation. Agencies can buy pooled locations with transparent per-location and per-grid usage; retain each client's isolation and consent.

## 7. Gross-margin example and sensitivity

For 100 Growth customers at $59: revenue $5,900. If infrastructure/usage is $650, infrastructure gross margin is approximately 89%. This excludes payment costs, refunds, support, development, taxes and acquisition, so it is not company profit.

If each customer requires 30 minutes of support/month at an assumed $15/hour internal cost, add $750. If paid directory work costs another $10/location, add $1,000. The business model changes substantially even though AI tokens remain cheap. Track support minutes and fulfillment separately from API cost.

## 8. Mandatory spending controls

1. Price catalog with provider/model/mode/unit/currency/verified date and review reminders.
2. Atomic credit reservation before external work; finalize actual cost afterward.
3. Per-tenant daily and monthly caps; provider-wide emergency caps and balance alarms.
4. Maximum keywords, points, depth, cadence, crawl pages, image variants and AI retries.
5. Separate scheduled economical scans from user-requested fast scans.
6. Batch upcoming content when supported and time-safe; cache lawful reusable research.
7. Do not regenerate unchanged content/assets or repeat scans due to button double-clicks.
8. Report cost per generated, approved and published item to reveal wasted drafts.
9. Stop new paid jobs at budget threshold while preserving drafts and existing hosted pages according to policy.
10. Overage must be prepaid or explicitly enabled with a clear cap; never silently recharge.

## 9. Development cost and procurement

The full build envelope of 12–18 weeks at 25–35 focused hours/week is roughly 300–630 hours. This is a planning range for one experienced builder; learning curves and approval work can increase it. Multiply by the actual builder rate rather than assuming a cheap hourly rate. Antigravity/Gemini developer plans, source hosting and optional design tools are separate development expenses.

Avoid launch subscriptions to several overlapping SEO suites, orchestration platforms and social aggregators. An aggregator can reduce approval/integration work but should be compared against per-connected-account charges and supported actions. Add it only if the saved engineering/support time outweighs its cost. The adapter boundary allows that decision later.
