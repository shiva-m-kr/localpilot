import { TenantContext } from '@localpilot/contracts';
import { TenantAccessDeniedError, ValidationFailedError } from '../errors.js';

export class StorageSecurityService {
  private static readonly DEFAULT_TTL_SECONDS = 900; // 15 minutes

  /**
   * Generates a strictly scoped tenant storage key.
   */
  static buildTenantStoragePath(
    organizationId: string,
    locationId: string,
    assetClass: 'photos' | 'logos' | 'crawls' | 'audits' | 'generated',
    filename: string
  ): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `tenants/${organizationId}/locations/${locationId}/${assetClass}/${sanitizedFilename}`;
  }

  /**
   * Validates access to an object storage path, strictly preventing cross-tenant asset retrieval.
   */
  static validateAssetAccess(context: TenantContext, storagePath: string): { organizationId: string; locationId: string } {
    const parts = storagePath.split('/');
    // Expected format: tenants/{orgId}/locations/{locId}/...
    if (parts.length < 5 || parts[0] !== 'tenants' || parts[2] !== 'locations') {
      throw new ValidationFailedError(`Malformed storage asset path: '${storagePath}'.`);
    }

    const pathOrgId = parts[1];
    const pathLocId = parts[3];

    if (pathOrgId !== context.organizationId) {
      throw new TenantAccessDeniedError(context.organizationId, pathLocId, {
        error: 'Cross-tenant storage access violation',
        attemptedPath: storagePath
      });
    }

    return { organizationId: pathOrgId, locationId: pathLocId };
  }

  /**
   * Generates a short-lived signed URL descriptor for private assets.
   */
  static createSignedUrlDescriptor(
    context: TenantContext,
    storagePath: string,
    ttlSeconds: number = StorageSecurityService.DEFAULT_TTL_SECONDS
  ): { path: string; expiresAt: Date; signedUrl: string } {
    this.validateAssetAccess(context, storagePath);

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    // Illustrative signed URL format for S3/R2 presigned GET
    const signedUrl = `https://media.localpilot.dev/${storagePath}?signature=auth-${context.organizationId}-${expiresAt.getTime()}&expires=${Math.floor(expiresAt.getTime() / 1000)}`;

    return {
      path: storagePath,
      expiresAt,
      signedUrl
    };
  }
}
