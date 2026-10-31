# ADR 004: S3-Compatible Object Storage (Cloudflare R2)

## Status
Accepted

## Context
LocalPilot manages diverse media and document assets:
- Verified business photos, logos, brand assets, and generated illustrations.
- Technical SEO crawl artifacts and sitemap files.
- Exported audit reports and CSVs.
- Temporary webhook payloads and raw integration evidence.

Direct database byte storage (BYTEA) increases database bloat and backup sizes. Public direct uploads pose severe security risks (unvalidated MIME, malicious files, tenant path traversal).

## Decision
1. Use **Cloudflare R2** (or MinIO for local development / AWS S3) via the standard `@aws-sdk/client-s3` interface.
2. Tenant asset isolation: Object storage paths are strictly prefixed by tenant scope:
   `tenants/{organization_id}/locations/{location_id}/{asset_class}/{asset_id}.{ext}`
3. Private-by-default access:
   - Private assets (drafts, internal audits, raw evidence) are accessible exclusively via short-lived pre-signed URLs (TTL: 15 minutes).
   - Only explicitly published website assets are served via a public CDN domain.
4. Retention policy enforcement:
   - Ephemeral crawl/evidence files carry lifecycle rules with automated deletion (30 days).

## Alternatives Considered
1. *Local Filesystem Storage*: Fails in containerized, multi-instance, or serverless deployments.
2. *Storing Images in PostgreSQL BYTEA*: Drastically slows down database replication, vacuuming, and backups.

## Consequences
- Zero egress fees with Cloudflare R2 reduces unpredictable operating expenses.
- Cross-tenant asset leakage is prevented through server-validated path generation and time-bounded signed URLs.
