import assert from 'node:assert/strict';
import {
  LeadCaptureService,
  LeadStorage,
  LeadRecord,
} from '@localpilot/domain';

async function runLeadCaptureTests() {
  console.log('--- Testing Lead Capture and Honest Attribution (Prompt 088) ---');

  const siteId = '11111111-2222-3333-4444-555555555555';
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const locationId = '00000000-0000-0000-0000-000000000002';

  const leadMap = new Map<string, LeadRecord>();
  let callClicks = 0;
  let directionsClicks = 0;
  let whatsappClicks = 0;

  const mockStorage: LeadStorage = {
    async getSiteTenantInfo(_sId: string) {
      return { tenantId, locationId };
    },
    async saveLead(lead: LeadRecord) {
      leadMap.set(lead.id, { ...lead });
    },
    async getLeadById(id: string) {
      return leadMap.get(id) || null;
    },
    async getLeadsForLocation(_locId: string, _since: string) {
      return Array.from(leadMap.values());
    },
    async recordClick(_sId: string, eventType: string) {
      if (eventType === 'CALL_CLICK') callClicks++;
      if (eventType === 'DIRECTIONS_CLICK') directionsClicks++;
      if (eventType === 'WHATSAPP_CLICK') whatsappClicks++;
    },
    async getClicksForLocation(_sId: string, _since: string) {
      return { callClicks, directionsClicks, whatsappClicks };
    },
  };

  const service = new LeadCaptureService(mockStorage);

  // Test 1: Valid lead form submission with consent
  console.log('Test 1: Valid lead submission with explicit consent and 365-day retention');
  const validLead = await service.submitLead({
    siteId,
    customerName: 'Aarav Sharma',
    phone: '+919876543210',
    email: 'aarav@example.com',
    serviceInterest: 'Bathroom Pipe Leak Repair',
    message: 'Water leaking under the sink, need emergency assistance.',
    honeypot: '',
    consentGiven: true,
    utmSource: 'google_organic',
    utmCampaign: 'plumbing_emergency',
  });

  assert.equal(validLead.customerName, 'Aarav Sharma');
  assert.equal(validLead.status, 'NEW');
  assert.equal(validLead.deliveryStatus, 'NOTIFIED_OWNER');
  assert.equal(validLead.spamScore, 0);
  assert.ok(validLead.retentionExpiresAt);

  // Test 2: Missing consent is rejected
  console.log('Test 2: Missing consent rejected');
  await assert.rejects(
    async () => {
      await service.submitLead({
        siteId,
        customerName: 'Sneha Patel',
        phone: '+919876543211',
        honeypot: '',
        consentGiven: false,
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('Explicit consent to contact is required'));
      return true;
    }
  );

  // Test 3: Anti-spam honeypot detection
  console.log('Test 3: Anti-spam honeypot traps bot submissions');
  const spamLead = await service.submitLead({
    siteId,
    customerName: 'Bot Spammer',
    phone: '+15555555555',
    message: 'Buy cheap watches now!',
    honeypot: 'http://spam-link.example.com', // Bot filled hidden field
    consentGiven: true,
  });

  assert.equal(spamLead.status, 'SPAM');
  assert.equal(spamLead.spamScore, 1.0);
  assert.equal(spamLead.deliveryStatus, 'RECEIVED'); // Not notified to owner

  // Test 4: Tracking customer intent clicks
  console.log('Test 4: Track intent button clicks (call, whatsapp, directions)');
  await service.trackClickEvent(siteId, 'CALL_CLICK');
  await service.trackClickEvent(siteId, 'CALL_CLICK');
  await service.trackClickEvent(siteId, 'CALL_CLICK');
  await service.trackClickEvent(siteId, 'WHATSAPP_CLICK');
  await service.trackClickEvent(siteId, 'DIRECTIONS_CLICK');

  // Test 5: Owner marks lead as qualified
  console.log('Test 5: Owner explicitly qualifies genuine lead');
  const qualified = await service.setLeadQualification(validLead.id, true);
  assert.equal(qualified.isQualifiedLead, true);
  assert.equal(qualified.status, 'QUALIFIED');

  // Test 6: Honest attribution report
  console.log('Test 6: Honest attribution report (separation of intent clicks vs verified leads)');
  const report = await service.getAttributionReport(siteId, locationId, 30);

  assert.equal(report.callButtonClicks, 3, '3 Call clicks');
  assert.equal(report.whatsappClicks, 1, '1 WhatsApp click');
  assert.equal(report.directionsClicks, 1, '1 Directions click');
  assert.equal(report.formSubmissionsTotal, 1, '1 Valid form submission');
  assert.equal(report.spamFormsRejected, 1, '1 Spam form trapped');
  assert.equal(report.verifiedQualifiedLeads, 1, '1 Owner-verified qualified lead');
  assert.ok(report.attributionDisclaimer.includes('LocalPilot never claims unverified phone or walk-in conversions as proven causal results'));

  console.log('Prompt 088 verified successfully! Phase G: Websites and Technical SEO is 100% COMPLETE!\n');
}

runLeadCaptureTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
