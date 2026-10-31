import {
  LeadRecord,
  SubmitLeadFormRequest,
  HonestAttributionReport,
} from '@localpilot/contracts';
import { ValidationFailedError } from './errors.js';
import { ContentSanitizer } from './security/contentSanitizer.js';

export interface LeadStorage {
  getSiteTenantInfo(siteId: string): Promise<{ tenantId: any; locationId: any } | null>;
  saveLead(lead: LeadRecord): Promise<void>;
  getLeadById(leadId: string): Promise<LeadRecord | null>;
  getLeadsForLocation(locationId: string, sinceDate: string): Promise<LeadRecord[]>;
  recordClick(siteId: string, eventType: string): Promise<void>;
  getClicksForLocation(siteId: string, sinceDate: string): Promise<{ callClicks: number; directionsClicks: number; whatsappClicks: number }>;
}

export class LeadCaptureService {
  private storage: LeadStorage;
  private readonly retentionDays: number = 365;

  constructor(storage: LeadStorage) {
    this.storage = storage;
  }

  /**
   * Submits a secure hosted enquiry form with anti-spam honeypot and mandatory consent
   */
  public async submitLead(request: SubmitLeadFormRequest): Promise<LeadRecord> {
    const siteInfo = await this.storage.getSiteTenantInfo(request.siteId);
    if (!siteInfo) {
      throw new ValidationFailedError(`Site '${request.siteId}' not found.`);
    }

    if (!request.consentGiven) {
      throw new ValidationFailedError('Explicit consent to contact is required before submitting lead form.');
    }

    const now = new Date();
    const retentionExpiresAt = new Date(now.getTime() + this.retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}`;

    // Anti-spam honeypot check: Bots fill hidden fields
    const isSpam = request.honeypot && request.honeypot.trim().length > 0;
    const spamScore = isSpam ? 1.0 : 0.0;
    const initialStatus = isSpam ? 'SPAM' : 'NEW';
    const deliveryStatus = isSpam ? 'RECEIVED' : 'NOTIFIED_OWNER';

    const cleanName = ContentSanitizer.sanitizeHtml(request.customerName).trim();
    const cleanMessage = request.message ? ContentSanitizer.sanitizeHtml(request.message).trim() : undefined;

    const lead: LeadRecord = {
      id,
      tenantId: siteInfo.tenantId,
      locationId: siteInfo.locationId,
      siteId: request.siteId,
      customerName: cleanName,
      phone: request.phone.trim(),
      email: request.email?.trim(),
      serviceInterest: request.serviceInterest?.trim(),
      message: cleanMessage,
      status: initialStatus,
      deliveryStatus,
      consentGiven: true,
      consentTimestamp: now.toISOString(),
      retentionExpiresAt,
      attributionSource: request.utmSource || 'direct_organic',
      utmCampaign: request.utmCampaign,
      isQualifiedLead: false,
      spamScore,
      createdAt: now.toISOString(),
    };

    await this.storage.saveLead(lead);
    return lead;
  }

  /**
   * Tracks customer intent click events (Call button, WhatsApp button, Directions)
   */
  public async trackClickEvent(
    siteId: string,
    eventType: 'CALL_CLICK' | 'DIRECTIONS_CLICK' | 'WHATSAPP_CLICK'
  ): Promise<void> {
    await this.storage.recordClick(siteId, eventType);
  }

  /**
   * Owner action to verify an enquiry as a genuine qualified lead
   */
  public async setLeadQualification(leadId: string, isQualified: boolean): Promise<LeadRecord> {
    const lead = await this.storage.getLeadById(leadId);
    if (!lead) {
      throw new ValidationFailedError(`Lead '${leadId}' not found.`);
    }

    lead.isQualifiedLead = isQualified;
    lead.status = isQualified ? 'QUALIFIED' : lead.status;
    await this.storage.saveLead(lead);
    return lead;
  }

  /**
   * Generates an honest attribution report strictly separating button clicks from confirmed leads
   */
  public async getAttributionReport(
    siteId: string,
    locationId: string,
    windowDays: number = 30
  ): Promise<HonestAttributionReport> {
    const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const leads = await this.storage.getLeadsForLocation(locationId, cutoffDate);
    const clicks = await this.storage.getClicksForLocation(siteId, cutoffDate);

    const validLeads = leads.filter((l) => l.status !== 'SPAM');
    const spamLeads = leads.filter((l) => l.status === 'SPAM');
    const qualifiedLeads = leads.filter((l) => l.isQualifiedLead);

    return {
      locationId: locationId as any,
      siteId,
      windowDays,
      callButtonClicks: clicks.callClicks,
      directionsClicks: clicks.directionsClicks,
      whatsappClicks: clicks.whatsappClicks,
      formSubmissionsTotal: validLeads.length,
      spamFormsRejected: spamLeads.length,
      verifiedQualifiedLeads: qualifiedLeads.length,
      attributionDisclaimer:
        'Button clicks (calls, directions, WhatsApp) represent observed on-site user intent and are tracked separately from verified form enquiries and owner-confirmed jobs. LocalPilot never claims unverified phone or walk-in conversions as proven causal results of marketing campaigns.',
    };
  }
}
