# LocalPilot Integration Feasibility & Capability Register

**Last Verified**: 28 October 2026  
**Document Status**: Authoritative Pre-Implementation Register  
**Decision Owner for Integration Policies & API Compliance**: Lead Engineer & Platform Compliance Officer  

---

## 1. Executive Summary & Gating Principle

LocalPilot adheres to the **Strict Gating Principle**:
> *An external capability is either verified with active credentials, approved permissions, and working tests, or it is explicitly marked DISABLED/BLOCKED with an actionable owner fallback. No third-party API capability is ever simulated as functioning when credentials or approvals are missing.*

---

## 2. Integration Feasibility Matrix

| Integration | Primary API / Version | Auth & Route | Granted Scopes / Permissions | Approval State | Supported Actions | Explicitly Blocked / Disallowed Actions | Fallback / Graceful Degradation |
|---|---|---|---|---|---|---|---|
| **Google Business Profile (GBP)** | Google My Business API v4.9 / Business Profile Performance API / My Business Account Management API | OAuth 2.0 PKCE Authorization Code | `https://www.googleapis.com/auth/business.manage` | **Requires Google Partner / Organization API Project Approval** (can take 60+ days) | 1. List accounts & authorized locations<br>2. Read location metadata (NAP, hours)<br>3. Read customer reviews<br>4. Submit single review reply<br>5. Publish local posts (What's New, Offer, Event) with photo | 1. Bulk auto-claiming or creating locations<br>2. Scraping unowned competitor GBP accounts<br>3. Permanent caching/exporting of Google review texts to external datasets<br>4. Automated aggressive reply generation without human review | UI displays "GBP Connection Pending Approval". Manual action packet generated for owner to update profile or copy-paste posts manually. |
| **Meta (Instagram & Facebook)** | Meta Graph API v21.0 / v22.0 | Facebook Login for Business with Business Verification | `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish` | **Requires Meta App Review & Verified Business Account** | 1. Discover Facebook Pages & connected Instagram Business accounts<br>2. Upload and publish single photo / carousel feed posts to Instagram<br>3. Publish status & image posts to Facebook Page<br>4. Read engagement metrics | 1. Personal Instagram profiles (unsupported by Graph API)<br>2. Instagram Stories/Reels in Phase 1<br>3. Automated DMs without Messenger API approval<br>4. Misrepresenting Developer Test accounts as live multi-tenant SaaS | UI shows "Meta App Review Required". Posts are prepared as downloadable creative assets (JPG + caption) with one-click copy for mobile posting. |
| **WordPress** | Core REST API (`/wp/v2/`) | HTTPS Application Passwords (built-in since WP 5.6) | Author / Editor user credentials with `edit_posts`, `publish_posts`, `upload_files` | **Owner Self-Authorized** (No external platform approval needed) | 1. Test connection & verify user capabilities<br>2. Upload featured images (`/wp/v2/media`)<br>3. Create draft posts (`/wp/v2/posts`)<br>4. Publish and schedule posts<br>5. Read back published URL and external post ID | 1. Direct PHP script execution<br>2. Overwriting arbitrary database options or themes<br>3. Modifying server `.htaccess` or server configs<br>4. Assuming third-party SEO plugin REST APIs are identical across all sites | Generates clean Markdown / Gutenberg HTML export with metadata for manual post creation if connection fails. |
| **Google Search Console (GSC)** | Google Search Console API v3 / v1 | OAuth 2.0 PKCE | `https://www.googleapis.com/auth/webmasters.readonly` | **Standard Google Cloud Consent Screen** (Owner verified site ownership) | 1. List verified web properties<br>2. Query Search Analytics (clicks, impressions, CTR, average position)<br>3. Filter by query, page, device, country, date | 1. Submitting ordinary blog posts via Google Indexing API (violates Google spam policies, reserved for JobPosting/Broadcast)<br>2. Assuming zero data latency (GSC data has 48–72h lag)<br>3. Equating GSC avg position with localized Maps rank | UI indicates exact data lag window and coverage. Manual CSV export ingestion option provided. |
| **Ranking Coordinates (SERP)** | DataForSEO Google Maps SERP API | API Key + Password via Basic Auth (Server-side only) | Direct account API balance | **Commercial Account Required** | 1. Query Google Maps coordinates grid (lat/lng, zoom, depth 20/50)<br>2. Retrieve rank position, place ID, business title, rating, review count<br>3. Asynchronous task queue with callback / polling | 1. Unbounded real-time scanning without pre-scan credit reservation<br>2. Inventing missing coordinates or pretending failed points are rank 0<br>3. Scraping via residential proxies without license | Mock/fixture coordinate data for development; explicit "Credits Required" gate in production with transparent cost estimates. |
| **Payment & Billing** | Razorpay (India-first) + Stripe (Global) | Server-to-server Webhooks with HMAC SHA256 Signature Verification | Subscriptions & Payment Links API | **Merchant Onboarding & KYC Required** | 1. Create recurring customer subscriptions<br>2. Idempotent webhook processing for invoice payments<br>3. Automated grace periods and subscription cancellation<br>4. Customer billing portal links | 1. Automatic card debit without RBI-mandated e-mandate AFA authentication in India<br>2. Storing raw cardholder data (PCI-DSS violation)<br>3. Uncapped overage auto-charges | Offline invoice generation / manual wire transfer payment status toggle for initial beta pilot tenants. |

---

## 3. High-Risk Uncertainty & Compliance Policy

### 3.1 Review Automation Policy
- **Core Uncertainty**: Automated responses to customer reviews may violate platform policies if generic, deceptive, or offensive. Furthermore, automated apologies for legal/safety complaints can create legal liability for local businesses.
- **Decision Owner**: Platform Compliance Officer & Product Lead.
- **Enforced Policy**:
  1. **Default Mode**: REVIEW-FIRST (Manual Owner Approval Required for every reply).
  2. **Eligible Auto-Reply Scope**: Only 4-star and 5-star reviews with verified positive sentiment, zero complaints, zero legal/medical/safety keywords, and uncomplicated text may be considered for auto-reply.
  3. **Strict Human Review Gates**: 1-star, 2-star, and 3-star reviews, sarcasm, complaints, allegations, refund requests, or privacy issues **STRICTLY REQUIRE** human owner assignment and escalation.
  4. **Daily Rate Limits & Random Jitter**: Maximum 5 auto-replies per location per day, with randomized dispatch delays (15–60 minutes) to avoid synthetic flooding.
  5. **Revocation**: The business owner can pause or disable auto-replies at any time via a prominent kill switch.

### 3.2 Historical GBP Data & Content Retention Policy
- **Core Uncertainty**: Google API Terms of Service strictly regulate the storage and repurposing of Google user reviews and business profiles.
- **Decision Owner**: Security & Data Privacy Lead.
- **Enforced Policy**:
  1. Review text and author names stored in LocalPilot are treated as an ephemeral cache with a strict 30-day Time-To-Live (TTL).
  2. Deleted reviews on Google are expunged from the LocalPilot database during reconciliation syncs.
  3. No GBP data is ever shared with third-party aggregators or used to train public machine learning models.
  4. Derived classifications (sentiment, category tags) are retained only in connection with active customer operational tasks.

---

## 4. Application & Review Checklist

### 4.1 Google Business Profile API Project Access
- [ ] Google Cloud Console project established with billing enabled.
- [ ] OAuth consent screen configured with privacy policy, terms of service, and domain verification.
- [ ] Business Profile API access request form submitted with production business use case.
- [ ] Scopes documented: `https://www.googleapis.com/auth/business.manage`.
- [ ] Designated test accounts with verified Google Business Profile ownership configured.

### 4.2 Meta Business Verification & App Review
- [ ] Meta Developer App registered as "Business" type.
- [ ] Business Manager account verified with official legal documentation (GST / Certificate of Incorporation).
- [ ] App Review submission prepared:
  - Video screencast demonstrating Facebook Page posting workflow.
  - Video screencast demonstrating Instagram feed image publishing workflow.
  - Permissions requested: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`.
- [ ] Privacy Policy URL and Data Deletion Callback URL deployed and tested.

### 4.3 WordPress REST API Spike Readiness
- [ ] Test WordPress installation (v6.4+) provisioned with HTTPS and clean permalinks (`/%postname%/`).
- [ ] Application Password generated for dedicated publishing user role (`Editor`).
- [ ] Confirmed REST endpoints respond: `GET /wp/v2/users/me`, `POST /wp/v2/media`, `POST /wp/v2/posts`.

---

## 5. Verification & Acceptance
- **Acceptance Gate**: All external capabilities that lack production authorization are blocked at the domain service layer with clean error codes (`PROVIDER_UNAUTHORIZED`, `CAPABILITY_BLOCKED`). No fake data or mock responses will be represented as live production calls.
- **Status**: PASSED and RECORDED.
