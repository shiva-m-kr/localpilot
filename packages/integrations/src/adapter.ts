export interface ProviderCapabilities {
  providerId: string;
  supportedActions: string[];
  unsupportedActions: string[];
  supportedMediaMimeTypes: string[];
  maxMediaCount: number;
  maxContentLength: number;
  requiresReviewFirst: boolean;
}

export interface PublishablePayload {
  itemId: string;
  title: string;
  content: string;
  mediaUrls: string[];
  mediaMimeTypes: string[];
  canonicalUrl?: string;
  tags?: string[];
}

export interface PublishResult {
  providerId: string;
  externalId: string;
  publishedUrl: string;
  publishedAt: string;
  rawResponseSummary?: string;
}

export type ReconcileState = 'confirmed_published' | 'not_found' | 'in_progress' | 'failed';

export interface ReconcileResult {
  providerId: string;
  externalId?: string;
  state: ReconcileState;
  publishedUrl?: string;
  observedAt: string;
  notes?: string;
}

export interface EvidenceRecord {
  source: string;
  metricName: string;
  value: number | string;
  observedAt: string;
  windowDays: number;
}

export interface ConnectionHealth {
  healthy: boolean;
  status: 'connected' | 'reconnect_required' | 'revoked' | 'error';
  lastCheckedAt: string;
  statusMessage: string;
}

/**
 * Standard Provider Adapter Interface.
 * Encapsulates all third-party SDKs, API versions, and credentials inside provider implementations.
 * Domain services interact exclusively with typed contracts, never importing raw provider response objects.
 * Prevents arbitrary SSRF/proxying with privileged server credentials.
 */
export interface ProviderAdapter {
  readonly providerId: string;
  getCapabilities(): ProviderCapabilities;
  validateConnection(credentials: Record<string, string>): Promise<ConnectionHealth>;
  publish(credentials: Record<string, string>, payload: PublishablePayload): Promise<PublishResult>;
  reconcile(credentials: Record<string, string>, externalIdOrKey: string): Promise<ReconcileResult>;
  fetchEvidence(credentials: Record<string, string>, query: Record<string, unknown>): Promise<EvidenceRecord[]>;
}
