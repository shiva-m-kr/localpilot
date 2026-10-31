# ADR 005: Provider Adapter Architecture, Encryption, and SSRF Prevention

## Status
Accepted

## Context
LocalPilot connects to multiple external services: WordPress REST, Google Business Profile, Google Search Console, Meta Graph API, and DataForSEO.
Risks:
- Leaking vendor SDK response structures into core domain business rules.
- Exposing API secrets or OAuth tokens in client-side bundles, telemetry, or server logs.
- Server-Side Request Forgery (SSRF) when crawling target website URLs or downloading remote media.

## Decision
1. **Uniform Typed Adapter Interface**:
   Each integration implements a standard TypeScript interface:
   ```typescript
   export interface ProviderAdapter<TConfig, TCredentials> {
     readonly providerId: string;
     checkCapabilities(creds: TCredentials): Promise<CapabilityReport>;
     validateConnection(creds: TCredentials): Promise<ConnectionHealth>;
     disconnect(creds: TCredentials): Promise<void>;
   }
   ```
   SDK objects and vendor-specific payloads are strictly confined within `packages/integrations`. Domain logic only receives normalized DTOs.
2. **Encrypted Secret Storage**:
   - Secrets (OAuth refresh tokens, WordPress application passwords, provider API keys) are encrypted before writing to PostgreSQL using AES-256-GCM.
   - Master encryption key is loaded strictly via server environment variables (`INTEGRATION_ENCRYPTION_KEY`).
   - Secret DTOs are stripped (`[REDACTED]`) before serializing to client responses or log outputs.
3. **Strict SSRF Protections for Crawl / Ingestion**:
   - URL validation rejects `localhost`, `127.0.0.1`, `::1`, link-local (`169.254.169.254`), private IP subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and unsafe URI schemes (`file:`, `gopher:`, `ftp:`).
   - Redirect targets are re-evaluated against the SSRF filter before following.
   - Max response size limits (e.g. 10MB) prevent memory exhaustion attacks.

## Alternatives Considered
1. *Calling Provider SDKs directly from UI components or API routes*: Tightly couples domain code to vendor quirks and increases refactoring cost when vendor APIs change.
2. *Storing plaintext tokens*: Poses severe security breach liability for customer platforms.

## Consequences
- Testing is straightforward because any provider adapter can be swapped with a deterministic fixture adapter.
- Network security and secret hygiene are centralized in tested boundary layers.
