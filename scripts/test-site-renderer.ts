import assert from 'node:assert/strict';
import {
  HostedSiteRecord,
  SiteRevision,
  SitePublicFacts,
  SiteRendererService,
  SiteStorage,
} from '@localpilot/domain';

async function runSiteRendererTests() {
  console.log('--- Testing Constrained Hosted-Site Renderer (Prompt 081) ---');

  const siteId = '11111111-2222-3333-4444-555555555555';
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const locationId = '00000000-0000-0000-0000-000000000002';
  const draftRevisionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const publishedRevisionId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const mockFactsSAB: SitePublicFacts = {
    businessName: 'Apex Emergency Plumbing',
    tagline: 'Fast 24/7 Leak & Drain Specialists',
    category: 'Plumber',
    phone: '+919876543210',
    email: 'help@apexplumbing.example.com',
    isSAB: true,
    hasHiddenAddress: true,
    streetAddress: '42 Secret Home Address, Floor 3',
    city: 'New Delhi',
    stateOrRegion: 'Delhi',
    postalCode: '110001',
    country: 'IN',
    operatingHours: [
      { dayOfWeek: 'MONDAY', opens: '08:00', closes: '20:00', isClosed: false },
      { dayOfWeek: 'TUESDAY', opens: '08:00', closes: '20:00', isClosed: false },
    ],
    serviceAreas: ['South Delhi', 'Central Delhi', 'Noida'],
  };

  const draftRevision: SiteRevision = {
    revisionId: draftRevisionId,
    siteId,
    templateType: 'SERVICE',
    templateVersion: 1,
    theme: {
      primaryColor: '#E0580C',
      secondaryColor: '#F97316',
      backgroundColor: '#FFF7ED',
      textColor: '#1E293B',
      fontFamilyHeading: 'Plus Jakarta Sans, sans-serif',
      fontFamilyBody: 'Inter, sans-serif',
      borderRadiusPx: 12,
    },
    blocks: [
      {
        id: '10000000-0000-0000-0000-000000000001',
        type: 'HERO',
        heading: 'Hero Heading',
        headline: 'Emergency Plumbing in Delhi <script>alert("hacked")</script>',
        primaryCtaText: 'Call Now',
        primaryCtaLink: 'tel:+919876543210',
        orderIndex: 0,
        isVisible: true,
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        type: 'SERVICES',
        heading: 'Our Trusted Services',
        services: [
          {
            id: '20000000-0000-0000-0000-000000000001',
            name: 'Pipe Leak Repair',
            description: 'Non-invasive leak detection and rapid repair.',
            startingPrice: 'Starting at ₹499',
            callToAction: 'Book Repair',
          },
        ],
        orderIndex: 1,
        isVisible: true,
      },
    ],
    metaTitle: 'Apex Emergency Plumbing | Delhi',
    metaDescription: 'Trusted 24/7 plumbing repair in South and Central Delhi.',
    createdAt: new Date().toISOString(),
    createdByUserId: '00000000-0000-0000-0000-000000000099',
    isPublished: false,
  };

  const publishedRevision: SiteRevision = {
    ...draftRevision,
    revisionId: publishedRevisionId,
    isPublished: true,
    publishedAt: new Date().toISOString(),
  };

  const mockSiteRecord: HostedSiteRecord = {
    id: siteId,
    tenantId,
    locationId,
    subdomain: 'apex-plumbing',
    currentPublishedRevisionId: publishedRevisionId,
    currentDraftRevisionId: draftRevisionId,
    templateType: 'SERVICE',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const storageMap = new Map<string, any>();
  storageMap.set(`site:${siteId}`, mockSiteRecord);
  storageMap.set(`rev:${draftRevisionId}`, draftRevision);
  storageMap.set(`rev:${publishedRevisionId}`, publishedRevision);
  storageMap.set(`facts:${locationId}`, mockFactsSAB);

  const mockStorage: SiteStorage = {
    async getSiteById(id: string) {
      return storageMap.get(`site:${id}`) || null;
    },
    async getRevisionById(id: string) {
      return storageMap.get(`rev:${id}`) || null;
    },
    async getConfirmedFacts(locId: string) {
      return storageMap.get(`facts:${locId}`) || null;
    },
  };

  const renderer = new SiteRendererService(mockStorage, 'test-secret');

  // Test 1: Public Rendering uses published revision, escapes scripts
  console.log('Test 1: Public Rendering uses published revision and sanitizes scripts');
  const publicResult = await renderer.renderSite({
    siteId,
    isPreview: false,
    host: 'apex-plumbing.localpilot.site',
  });

  assert.equal(publicResult.statusCode, 200);
  assert.equal(publicResult.revisionId, publishedRevisionId);
  assert.ok(publicResult.html.includes('Emergency Plumbing in Delhi &lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;'), 'Script tag must be escaped!');
  assert.ok(!publicResult.html.includes('<script>alert'), 'Raw script tag must NOT exist in HTML!');
  assert.ok(publicResult.html.includes('<meta name="robots" content="index, follow">'), 'Public page must allow indexing!');
  assert.ok(publicResult.headers['Cache-Control'], 'Public page should have cache control headers');

  // Test 2: SAB Address Suppression
  console.log('Test 2: SAB Address Suppression (street address must not leak)');
  assert.ok(!publicResult.html.includes('42 Secret Home Address'), 'SAB residential address must NOT leak in HTML!');
  assert.ok(publicResult.html.includes('Serving New Delhi, Delhi 110001'), 'City and postal code are preserved');

  // Test 3: Authenticated Draft Preview with Token
  console.log('Test 3: Authenticated Draft Preview requires valid token and sets noindex');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
  const validToken = renderer.generatePreviewToken(siteId, draftRevisionId, expiresAt);

  const previewResult = await renderer.renderSite({
    siteId,
    isPreview: true,
    previewToken: validToken,
    host: 'apex-plumbing.localpilot.site',
  });

  assert.equal(previewResult.statusCode, 200);
  assert.equal(previewResult.revisionId, draftRevisionId);
  assert.ok(previewResult.html.includes('<meta name="robots" content="noindex, nofollow">'), 'Draft preview must have noindex meta!');
  assert.equal(previewResult.headers['X-Robots-Tag'], 'noindex, nofollow', 'Draft preview must have X-Robots-Tag header!');
  assert.ok(previewResult.html.includes('PREVIEW MODE — DRAFT REVISION'), 'Preview banner must be visible!');

  // Test 4: Unauthenticated or expired preview token gets 403 Forbidden
  console.log('Test 4: Invalid preview token gets 403 Forbidden');
  const forbiddenResult = await renderer.renderSite({
    siteId,
    isPreview: true,
    previewToken: 'invalid-token',
    host: 'apex-plumbing.localpilot.site',
  });
  assert.equal(forbiddenResult.statusCode, 403);
  assert.ok(forbiddenResult.html.includes('403 - Invalid or Expired Preview Token'));

  // Test 5: Template Migration preserves owner content
  console.log('Test 5: Template Migration preserves existing blocks and content');
  const migrated = renderer.migrateTemplate(publishedRevision, 'APPOINTMENT');
  assert.equal(migrated.templateType, 'APPOINTMENT');
  assert.equal(migrated.templateVersion, 2);
  assert.equal(migrated.blocks.length, publishedRevision.blocks.length);
  assert.equal((migrated.blocks[1] as any).services[0].name, 'Pipe Leak Repair');
  assert.equal(migrated.isPublished, false, 'Migrated revision starts as unpublished draft');

  console.log('Prompt 081 verified successfully!\n');
}

runSiteRendererTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
