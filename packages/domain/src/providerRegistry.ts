import {
  ProviderAdapter,
  PublishablePayload,
  PublishResult,
  ReconcileResult
} from '@localpilot/integrations';
import {
  UnsupportedActionError,
  ReconnectRequiredError,
  ValidationFailedError,
  BaseDomainError
} from './errors.js';

export class ProviderRegistry {
  private static adapters = new Map<string, ProviderAdapter>();

  static register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  static get(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new UnsupportedActionError(
        'provider_lookup',
        `Provider adapter for '${providerId}' is not registered.`
      );
    }
    return adapter;
  }

  /**
   * Executes a publish through the adapter with standardized error translation.
   * Domain services never have to import third-party SDKs or raw provider response types.
   */
  static async publishThroughAdapter(
    providerId: string,
    credentials: Record<string, string>,
    payload: PublishablePayload
  ): Promise<PublishResult> {
    const adapter = this.get(providerId);
    const caps = adapter.getCapabilities();

    // 1. Check supported actions
    if (!caps.supportedActions.includes('publish_post') && !caps.supportedActions.includes('publish_photo')) {
      throw new UnsupportedActionError(
        'publish',
        `Provider '${providerId}' does not support publishing operations.`
      );
    }

    // 2. Validate media support
    for (const mime of payload.mediaMimeTypes) {
      if (!caps.supportedMediaMimeTypes.includes(mime)) {
        throw new ValidationFailedError(
          `Media MIME type '${mime}' is unsupported by provider '${providerId}'.`
        );
      }
    }

    try {
      return await adapter.publish(credentials, payload);
    } catch (err: any) {
      if (err instanceof BaseDomainError) throw err;
      if (err.message?.includes('unsupported media type')) {
        throw new ValidationFailedError(err.message);
      }
      throw new ValidationFailedError(`Provider ${providerId} publish failed: ${err.message}`);
    }
  }

  /**
   * Executes reconciliation through the adapter with standardized error translation.
   */
  static async reconcileThroughAdapter(
    providerId: string,
    credentials: Record<string, string>,
    externalId: string
  ): Promise<ReconcileResult> {
    const adapter = this.get(providerId);
    return await adapter.reconcile(credentials, externalId);
  }
}
