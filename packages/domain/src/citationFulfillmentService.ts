import {
  CitationFulfillmentRecord,
  CitationEvidence,
  DirectoryCatalogItem,
} from '@localpilot/contracts';
import { ValidationFailedError, ConflictError } from './errors.js';
import { CitationCatalogService } from './citationCatalogService.js';

export interface CitationFulfillmentStorage {
  getFulfillmentById(id: string): Promise<CitationFulfillmentRecord | null>;
  getFulfillmentByDirectory(locationId: string, directoryId: string): Promise<CitationFulfillmentRecord | null>;
  saveFulfillment(record: CitationFulfillmentRecord): Promise<void>;
  getConfirmedBusinessFacts(locationId: string): Promise<{ businessName: string; phone: string } | null>;
  spendCredits(tenantId: string, amount: number, memo: string): Promise<void>;
}

export class CitationFulfillmentService {
  private storage: CitationFulfillmentStorage;
  private catalogService: CitationCatalogService;

  constructor(storage: CitationFulfillmentStorage, catalogService?: CitationCatalogService) {
    this.storage = storage;
    this.catalogService = catalogService || new CitationCatalogService();
  }

  /**
   * Prepares a citation fulfillment record for a given directory
   */
  public async prepareFulfillment(
    tenantId: string,
    locationId: string,
    directoryId: string
  ): Promise<CitationFulfillmentRecord> {
    const existing = await this.storage.getFulfillmentByDirectory(locationId, directoryId);
    if (existing && existing.status !== 'REJECTED') {
      return existing;
    }

    const directories = this.catalogService.getDirectories({ country: 'IN' });
    const globalDirs = this.catalogService.getDirectories({ country: 'GLOBAL' });
    const dir = [...directories, ...globalDirs].find((d) => d.id === directoryId);

    if (!dir) {
      throw new ValidationFailedError(`Directory '${directoryId}' not found in catalog.`);
    }

    const now = new Date().toISOString();
    const submissionMethod =
      dir.submissionMethod === 'DIRECT_API'
        ? 'DIRECT_API'
        : dir.submissionMethod === 'PARTNER_FEED'
        ? 'PARTNER_FEED'
        : 'MANUAL_PACKET';

    const record: CitationFulfillmentRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ful-${Date.now()}`,
      tenantId: tenantId as any,
      locationId: locationId as any,
      directoryId: dir.id,
      directoryName: dir.name,
      status: 'PREPARED',
      isLiveVerified: false,
      submissionMethod,
      partnerFeeCreditsSpent: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveFulfillment(record);
    return record;
  }

  /**
   * Dispatches submission with budget protection and retry deduplication
   */
  public async submitCitation(
    fulfillmentId: string,
    authorizedBudgetCredits: number
  ): Promise<CitationFulfillmentRecord> {
    const record = await this.storage.getFulfillmentById(fulfillmentId);
    if (!record) {
      throw new ValidationFailedError(`Fulfillment record '${fulfillmentId}' not found.`);
    }

    if (record.isLiveVerified) {
      throw new ConflictError('Citation listing is already live and verified.');
    }

    const strategy = this.catalogService.evaluateSubmissionStrategy(record.directoryId);

    // Partner fee handling with retry deduplication
    const requiredPartnerCredits = record.submissionMethod === 'PARTNER_FEED' ? 10 : 0;
    if (record.partnerFeeCreditsSpent === 0 && requiredPartnerCredits > 0) {
      if (authorizedBudgetCredits < requiredPartnerCredits) {
        throw new ValidationFailedError(
          `Partner feed submission requires ${requiredPartnerCredits} credits, but authorized budget is ${authorizedBudgetCredits}.`
        );
      }
      await this.storage.spendCredits(record.tenantId, requiredPartnerCredits, `Citation submission: ${record.directoryName}`);
      record.partnerFeeCreditsSpent = requiredPartnerCredits;
      record.partnerOrderId = `order-${Date.now()}`;
    }

    const now = new Date().toISOString();
    record.submittedAt = now;
    record.updatedAt = now;

    if (strategy.strategy === 'OWNER_TASK_REQUIRED' || strategy.requiresOwnerOtp) {
      record.status = 'VERIFICATION_NEEDED';
      record.ownerTask = {
        taskType: strategy.requiresOwnerOtp ? 'ENTER_PHONE_OTP' : 'CLAIM_MANUAL_PROFILE',
        instruction: `Please open ${record.directoryName} portal, submit business profile, and confirm OTP sent to your business phone.`,
        portalUrl: strategy.actionableUrl,
        isPendingOwnerAction: true,
      };
    } else {
      // Direct API or partner network feed
      record.status = 'SUBMITTED';
      record.ownerTask = undefined;
    }

    // Crucial rule: isLiveVerified strictly remains false upon submission!
    record.isLiveVerified = false;

    await this.storage.saveFulfillment(record);
    return record;
  }

  /**
   * Completes owner task (e.g. entering OTP or portal verification link)
   */
  public async completeOwnerVerificationTask(
    fulfillmentId: string,
    verificationCode: string,
    liveListingUrl?: string
  ): Promise<CitationFulfillmentRecord> {
    const record = await this.storage.getFulfillmentById(fulfillmentId);
    if (!record) {
      throw new ValidationFailedError(`Fulfillment record '${fulfillmentId}' not found.`);
    }

    if (!record.ownerTask || !record.ownerTask.isPendingOwnerAction) {
      throw new ValidationFailedError('No pending owner verification task found on this record.');
    }

    if (!verificationCode || verificationCode.trim().length < 2) {
      throw new ValidationFailedError('Valid OTP or verification confirmation is required.');
    }

    const now = new Date().toISOString();
    record.ownerTask.isPendingOwnerAction = false;
    record.updatedAt = now;

    if (liveListingUrl) {
      // Live evidence provided
      const facts = await this.storage.getConfirmedBusinessFacts(record.locationId);
      return this.verifyLiveCitation(fulfillmentId, {
        liveListingUrl,
        observedAt: now,
        verifiedBusinessName: facts?.businessName || '',
        verifiedPhone: facts?.phone || '',
      });
    }

    record.status = 'SUBMITTED';
    await this.storage.saveFulfillment(record);
    return record;
  }

  /**
   * Verifies live listing evidence before entering verified count
   */
  public async verifyLiveCitation(
    fulfillmentId: string,
    evidence: CitationEvidence
  ): Promise<CitationFulfillmentRecord> {
    const record = await this.storage.getFulfillmentById(fulfillmentId);
    if (!record) {
      throw new ValidationFailedError(`Fulfillment record '${fulfillmentId}' not found.`);
    }

    const facts = await this.storage.getConfirmedBusinessFacts(record.locationId);
    if (facts) {
      // Match business name loosely
      const cleanExpected = facts.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanObserved = evidence.verifiedBusinessName.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!cleanObserved.includes(cleanExpected) && !cleanExpected.includes(cleanObserved)) {
        throw new ValidationFailedError(
          `Evidence mismatch: Listing business name '${evidence.verifiedBusinessName}' does not match confirmed business facts '${facts.businessName}'.`
        );
      }
    }

    const now = new Date().toISOString();
    record.status = 'LIVE_VERIFIED';
    record.isLiveVerified = true;
    record.evidence = evidence;
    record.verifiedAt = now;
    record.updatedAt = now;

    await this.storage.saveFulfillment(record);
    return record;
  }
}
