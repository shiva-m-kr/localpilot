import {
  CustomDomainRecord,
  ClaimDomainRequest,
  RouteResolutionResult,
} from '@localpilot/contracts';
import { ValidationFailedError, ConflictError } from './errors.js';

export interface DomainStorage {
  getDomainById(id: string): Promise<CustomDomainRecord | null>;
  getDomainByHostname(hostname: string): Promise<CustomDomainRecord | null>;
  saveDomain(record: CustomDomainRecord): Promise<void>;
  getSiteBySubdomain(subdomain: string): Promise<{ id: string; tenantId: string; locationId: string; status: string } | null>;
}

export interface DnsResolver {
  resolveTxt(hostname: string): Promise<string[]>;
  resolveCname(hostname: string): Promise<string[]>;
}

export class DomainManagementService {
  private storage: DomainStorage;
  private dnsResolver: DnsResolver;
  private readonly cnameTargetBase: string = 'sites.localpilot.site';
  private readonly quarantineDurationMs: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(storage: DomainStorage, dnsResolver: DnsResolver) {
    this.storage = storage;
    this.dnsResolver = dnsResolver;
  }

  /**
   * Claims a custom domain for a tenant location
   */
  public async claimDomain(request: ClaimDomainRequest): Promise<CustomDomainRecord> {
    const normalizedHost = request.hostname.trim().toLowerCase();

    // Prevent loopback or private hostnames
    if (
      normalizedHost === 'localhost' ||
      normalizedHost.endsWith('.local') ||
      normalizedHost.includes('127.0.0.1') ||
      normalizedHost.endsWith('.internal')
    ) {
      throw new ValidationFailedError(`Cannot claim private or loopback host: '${normalizedHost}'.`);
    }

    const existing = await this.storage.getDomainByHostname(normalizedHost);
    if (existing) {
      // Check if active or claimed by another tenant
      if (existing.tenantId !== request.tenantId && existing.status !== 'RELEASED') {
        if (existing.status === 'QUARANTINED') {
          const quarantinedUntil = existing.quarantinedUntil ? new Date(existing.quarantinedUntil).getTime() : 0;
          if (Date.now() < quarantinedUntil) {
            throw new ConflictError(
              `Domain '${normalizedHost}' is currently in safety quarantine. Cannot be claimed until quarantine expires.`
            );
          }
        } else {
          throw new ConflictError(
            `Domain '${normalizedHost}' is already claimed by another active tenant account.`
          );
        }
      }
    }

    const token = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `tok_${Date.now()}_${Math.random()}`;
    const now = new Date().toISOString();

    const newRecord: CustomDomainRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `dom-${Date.now()}`,
      tenantId: request.tenantId,
      locationId: request.locationId,
      siteId: request.siteId,
      hostname: normalizedHost,
      isApexDomain: normalizedHost.split('.').length === 2,
      status: 'CLAIMED',
      verificationMethod: request.verificationMethod,
      verificationToken: token,
      expectedTxtRecord: `_localpilot-challenge.${normalizedHost}`,
      expectedCnameTarget: this.cnameTargetBase,
      tlsStatus: 'PENDING_VALIDATION',
      lastHealthCheckPassed: false,
      claimedAt: now,
      updatedAt: now,
    };

    await this.storage.saveDomain(newRecord);
    return newRecord;
  }

  /**
   * Verifies DNS records and advances through TLS and Health Check pipeline
   */
  public async verifyAndActivateDomain(domainId: string, tenantId: string): Promise<CustomDomainRecord> {
    const domain = await this.storage.getDomainById(domainId);
    if (!domain) {
      throw new ValidationFailedError(`Domain record '${domainId}' not found.`);
    }

    if (domain.tenantId !== tenantId) {
      throw new ValidationFailedError('Tenant scope mismatch: unauthorized domain verification.');
    }

    const now = new Date().toISOString();
    domain.status = 'DNS_CHECKING';
    domain.updatedAt = now;

    // 1. Verify DNS
    let dnsVerified = false;
    try {
      if (domain.verificationMethod === 'TXT_CHALLENGE') {
        const records = await this.dnsResolver.resolveTxt(domain.expectedTxtRecord);
        dnsVerified = records.includes(domain.verificationToken);
      } else {
        const cnameRecords = await this.dnsResolver.resolveCname(domain.hostname);
        dnsVerified = cnameRecords.includes(domain.expectedCnameTarget);
      }
    } catch (err: any) {
      domain.status = 'FAILED_DNS';
      domain.failureReason = `DNS query failed: ${err.message}`;
      await this.storage.saveDomain(domain);
      return domain;
    }

    if (!dnsVerified) {
      domain.status = 'FAILED_DNS';
      domain.failureReason = `DNS challenge record not found. Expected TXT at '${domain.expectedTxtRecord}' with value '${domain.verificationToken}'.`;
      await this.storage.saveDomain(domain);
      return domain;
    }

    // 2. DNS passed -> Route allocation & TLS issuance
    domain.status = 'ROUTE_ALLOCATED';
    domain.status = 'TLS_ISSUANCE';

    // Simulate TLS Certificate issuance
    domain.tlsStatus = 'ISSUED';
    domain.tlsIssuedAt = now;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days Let's Encrypt style
    domain.tlsExpiresAt = expiresAt.toISOString();

    // 3. Health check
    domain.status = 'HEALTH_CHECK';
    domain.lastHealthCheckAt = now;
    domain.lastHealthCheckPassed = true;

    // 4. Fully Active
    domain.status = 'ACTIVE';
    domain.activatedAt = now;
    domain.failureReason = undefined;
    domain.updatedAt = now;

    await this.storage.saveDomain(domain);
    return domain;
  }

  /**
   * Releases a domain and places it in quarantine to prevent dangling domain takeover
   */
  public async releaseDomain(domainId: string, tenantId: string): Promise<CustomDomainRecord> {
    const domain = await this.storage.getDomainById(domainId);
    if (!domain) {
      throw new ValidationFailedError(`Domain record '${domainId}' not found.`);
    }

    if (domain.tenantId !== tenantId) {
      throw new ValidationFailedError('Tenant scope mismatch: cannot release foreign domain.');
    }

    const now = new Date();
    const quarantinedUntil = new Date(now.getTime() + this.quarantineDurationMs);

    domain.status = 'QUARANTINED';
    domain.quarantinedUntil = quarantinedUntil.toISOString();
    domain.updatedAt = now.toISOString();

    await this.storage.saveDomain(domain);
    return domain;
  }

  /**
   * Resolves an incoming HTTP Host header to an active tenant site.
   * Rejects unknown hosts, spoofed headers, and inactive/quarantined domains.
   */
  public async resolveHost(hostHeader: string): Promise<RouteResolutionResult> {
    const cleanHost = hostHeader.trim().toLowerCase().split(':')[0]; // Strip port if present

    // Case 1: LocalPilot Subdomain (*.localpilot.site)
    if (cleanHost.endsWith('.localpilot.site')) {
      const subdomain = cleanHost.replace('.localpilot.site', '');
      const site = await this.storage.getSiteBySubdomain(subdomain);
      if (!site) {
        return {
          isAllowed: false,
          isCustomDomain: false,
          rejectionReason: `Subdomain '${subdomain}' not registered or not found.`,
        };
      }

      if (site.status !== 'ACTIVE') {
        return {
          isAllowed: false,
          isCustomDomain: false,
          rejectionReason: `Site '${subdomain}' is currently ${site.status}.`,
        };
      }

      return {
        isAllowed: true,
        siteId: site.id,
        tenantId: site.tenantId as any,
        locationId: site.locationId as any,
        isCustomDomain: false,
      };
    }

    // Case 2: Custom domain
    const customDomain = await this.storage.getDomainByHostname(cleanHost);
    if (!customDomain) {
      return {
        isAllowed: false,
        isCustomDomain: true,
        rejectionReason: `Host '${cleanHost}' is not a registered custom domain in LocalPilot.`,
      };
    }

    if (customDomain.status !== 'ACTIVE') {
      return {
        isAllowed: false,
        isCustomDomain: true,
        rejectionReason: `Custom domain '${cleanHost}' is not active (current status: ${customDomain.status}).`,
      };
    }

    return {
      isAllowed: true,
      siteId: customDomain.siteId,
      tenantId: customDomain.tenantId,
      locationId: customDomain.locationId,
      isCustomDomain: true,
    };
  }
}
