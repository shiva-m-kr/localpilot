import { TenantContext } from '@localpilot/contracts';
import { TenantAccessDeniedError } from '@localpilot/domain';
import { Organization } from '../schema/organizations.js';
import { Business } from '../schema/businesses.js';
import { Location } from '../schema/locations.js';
import { Draft, PublishedSite } from '../schema/sites.js';

export class TenantSafeRepository {
  /**
   * Asserts that a target resource belongs to the tenant context.
   * Throws TenantAccessDeniedError if a user attempts to access a foreign organization's resource.
   */
  static assertTenantOwnership<T extends { organizationId: string }>(
    context: TenantContext,
    resource: T,
    resourceType: string = 'Resource'
  ): void {
    if (resource.organizationId !== context.organizationId) {
      throw new TenantAccessDeniedError(
        context.organizationId,
        (resource as any).locationId,
        {
          error: 'Cross-tenant access violation',
          requestedOrganizationId: resource.organizationId,
          authenticatedOrganizationId: context.organizationId,
          resourceType
        }
      );
    }
  }

  /**
   * Resolves tenant scope strictly from the authenticated server context,
   * ignoring any forged organization ID sent in client request bodies or headers.
   */
  static resolveEffectiveOrganizationId(
    context: TenantContext,
    untrustedBrowserSuppliedOrgId?: string
  ): string {
    // If browser supplied an untrusted ID that differs from authenticated session, block or ignore it
    if (untrustedBrowserSuppliedOrgId && untrustedBrowserSuppliedOrgId !== context.organizationId) {
      throw new TenantAccessDeniedError(
        context.organizationId,
        undefined,
        {
          error: 'Forged browser organization ID detected',
          untrustedBrowserSuppliedOrgId,
          authenticatedOrganizationId: context.organizationId
        }
      );
    }

    return context.organizationId;
  }

  /**
   * Safe data export: extracts only records that strictly match context.organizationId.
   */
  static filterExportForTenant<T extends { organizationId: string }>(
    context: TenantContext,
    items: T[]
  ): T[] {
    return items.filter(item => item.organizationId === context.organizationId);
  }

  /**
   * Worker Payload Reauthorization:
   * Revalidates that a background job payload has valid active organization context
   * before worker job execution.
   */
  static validateWorkerPayloadContext(
    jobTenantContext: { organizationId: string; locationId?: string },
    activeOrgIds: Set<string>
  ): void {
    if (!jobTenantContext.organizationId || !activeOrgIds.has(jobTenantContext.organizationId)) {
      throw new TenantAccessDeniedError(
        jobTenantContext.organizationId,
        jobTenantContext.locationId,
        { error: 'Worker job payload contains invalid or inactive organization ID' }
      );
    }
  }

  /**
   * Published site public read projection:
   * Returns published site without requiring tenant authentication, but ONLY if isLive is true.
   * Never exposes internal drafts or private notes.
   */
  static getPublicSiteProjection(site: PublishedSite): {
    slug: string;
    customDomain: string | null;
    renderedHtml: string;
    metaTitle: string;
    metaDescription: string | null;
  } | null {
    if (!site.isLive) {
      return null;
    }

    return {
      slug: site.slug,
      customDomain: site.customDomain,
      renderedHtml: site.renderedHtml,
      metaTitle: site.metaTitle,
      metaDescription: site.metaDescription
    };
  }

  /**
   * Drafts access guard:
   * Rejects unauthenticated or cross-tenant access to draft content.
   */
  static getPrivateDraft(context: TenantContext, draft: Draft): Draft {
    this.assertTenantOwnership(context, draft, 'Draft');
    return draft;
  }
}
