import assert from 'node:assert/strict';
import {
  HostedSiteRecord,
  SiteRevision,
  SiteEditorService,
  SiteEditorStorage,
  SiteBlock,
} from '@localpilot/domain';

async function runSiteEditorTests() {
  console.log('--- Testing Page/Block Editing and Revision Previews (Prompt 082) ---');

  const siteId = '11111111-2222-3333-4444-555555555555';
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const locationId = '00000000-0000-0000-0000-000000000002';
  const initialDraftId = 'draft-rev-1';
  const publishedRevId = 'pub-rev-0';

  const mockSiteRecord: HostedSiteRecord = {
    id: siteId,
    tenantId,
    locationId,
    subdomain: 'apex-service',
    currentPublishedRevisionId: publishedRevId,
    currentDraftRevisionId: initialDraftId,
    templateType: 'SERVICE',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const block1: SiteBlock = {
    id: 'block-1111-1111-1111-111111111111',
    type: 'HERO',
    heading: 'Fast Plumbing Repair',
    headline: 'Emergency Plumbing in Delhi',
    primaryCtaText: 'Call Now',
    primaryCtaLink: 'tel:+919876543210',
    orderIndex: 0,
    isVisible: true,
  };

  const block2: SiteBlock = {
    id: 'block-2222-2222-2222-222222222222',
    type: 'SERVICES',
    heading: 'Core Services',
    services: [
      {
        id: 'svc-1',
        name: 'Pipe Replacement',
        description: 'Complete copper and PVC pipe installation',
      },
    ],
    orderIndex: 1,
    isVisible: true,
  };

  const initialDraftRevision: SiteRevision = {
    revisionId: initialDraftId,
    siteId,
    templateType: 'SERVICE',
    templateVersion: 1,
    theme: {
      primaryColor: '#E0580C',
      secondaryColor: '#F97316',
      backgroundColor: '#FFF7ED',
      textColor: '#1E293B',
      fontFamilyHeading: 'Plus Jakarta Sans',
      fontFamilyBody: 'Inter',
      borderRadiusPx: 12,
    },
    blocks: [block1, block2],
    metaTitle: 'Apex Plumbing Initial Title',
    metaDescription: 'Initial Description',
    createdAt: new Date().toISOString(),
    createdByUserId: 'user-1',
    isPublished: false,
  };

  const siteMap = new Map<string, HostedSiteRecord>([[siteId, { ...mockSiteRecord }]]);
  const revisionMap = new Map<string, SiteRevision>([[initialDraftId, initialDraftRevision]]);
  const confirmedAreas = ['South Delhi', 'Central Delhi', 'Noida'];
  const existingPages = [
    'Emergency plumbing repairs leak detection copper pipe fitting bathroom water heaters in Delhi South Delhi',
  ];

  const mockStorage: SiteEditorStorage = {
    async getSiteById(id: string) {
      return siteMap.get(id) || null;
    },
    async updateSite(site: HostedSiteRecord) {
      siteMap.set(site.id, { ...site });
    },
    async getRevisionById(id: string) {
      return revisionMap.get(id) || null;
    },
    async saveRevision(rev: SiteRevision) {
      revisionMap.set(rev.revisionId, { ...rev });
    },
    async getConfirmedServiceAreas(_locId: string) {
      return confirmedAreas;
    },
    async getAllPageContents(_siteId: string) {
      return existingPages;
    },
  };

  const editor = new SiteEditorService(mockStorage);

  // Test 1: Optimistic concurrency / Stale revision error
  console.log('Test 1: Stale revision detection');
  await assert.rejects(
    async () => {
      await editor.updateDraftBlocks(siteId, 'wrong-revision-id', [block1]);
    },
    (err: any) => {
      assert.ok(err.message.includes('Stale revision detected'));
      return true;
    }
  );

  // Test 2: Valid block update and reorder
  console.log('Test 2: Valid block update');
  const updatedBlock1 = { ...block1, heading: 'Updated 24/7 Plumbing Repair' };
  const updatedRev = await editor.updateDraftBlocks(siteId, initialDraftId, [block2, updatedBlock1]);
  assert.equal(updatedRev.blocks[0].id, block2.id, 'Block 2 is now first');
  assert.equal(updatedRev.blocks[0].orderIndex, 0);
  assert.equal(updatedRev.blocks[1].id, block1.id, 'Block 1 is now second');
  assert.equal(updatedRev.blocks[1].orderIndex, 1);
  assert.equal((updatedRev.blocks[1] as any).heading, 'Updated 24/7 Plumbing Repair');

  // Test 3: Revision Compare / Diff
  console.log('Test 3: Revision compare structural diff');
  const snapshotRev: SiteRevision = { ...initialDraftRevision, revisionId: 'draft-rev-snapshot' };
  revisionMap.set(snapshotRev.revisionId, snapshotRev);
  const diff = await editor.compareRevisions(snapshotRev.revisionId, initialDraftId);
  assert.equal(diff.blocksModified.length, 2, 'Both blocks changed order/heading');

  // Test 4: Explicit Publish binds live revision and clones next draft
  console.log('Test 4: Explicit Publish creates immutable live revision');
  const publishResult = await editor.publishRevision(siteId, initialDraftId);
  assert.equal(publishResult.publishedRevisionId, initialDraftId);
  assert.notEqual(publishResult.nextDraftRevisionId, initialDraftId);

  const liveSite = await mockStorage.getSiteById(siteId);
  assert.equal(liveSite?.currentPublishedRevisionId, initialDraftId);
  assert.equal(liveSite?.currentDraftRevisionId, publishResult.nextDraftRevisionId);

  const liveRevision = await mockStorage.getRevisionById(initialDraftId);
  assert.equal(liveRevision?.isPublished, true);
  assert.ok(liveRevision?.publishedAt);

  // Test 5: Revision Restore creates fresh working draft
  console.log('Test 5: Revision Restore');
  const restored = await editor.restoreRevision(siteId, initialDraftId);
  assert.equal(restored.isPublished, false);
  const updatedSiteAfterRestore = await mockStorage.getSiteById(siteId);
  assert.equal(updatedSiteAfterRestore?.currentDraftRevisionId, restored.revisionId);

  // Test 6: Anti-doorway page validation
  console.log('Test 6: Anti-Doorway page validation');
  // 6a: Unconfirmed service area
  const unconfirmedAreaResult = await editor.validateLocalPageAgainstDoorways({
    siteId,
    targetCityOrArea: 'Mumbai', // Not in confirmed areas: ['South Delhi', 'Central Delhi', 'Noida']
    serviceFocus: 'Plumbing',
    slug: 'plumber-mumbai',
    differentiatedOfferings: ['Local Mumbai team', 'Fast response'],
    confirmedPremisesOrServiceArea: 'Mumbai',
    customBioOrIntro: 'Providing specialized commercial plumbing for corporate offices in Mumbai BKC.',
  });
  assert.equal(unconfirmedAreaResult.isAllowed, false);
  assert.ok(unconfirmedAreaResult.rejectionReason?.includes('not in the confirmed business service areas'));

  // 6b: Near-duplicate boilerplate (>75% similarity with existing page)
  const duplicateResult = await editor.validateLocalPageAgainstDoorways({
    siteId,
    targetCityOrArea: 'South Delhi',
    serviceFocus: 'Plumbing',
    slug: 'plumber-south-delhi',
    differentiatedOfferings: ['Leak detection copper pipe fitting'],
    confirmedPremisesOrServiceArea: 'South Delhi',
    customBioOrIntro: 'Emergency plumbing repairs leak detection copper pipe fitting bathroom water heaters in Delhi South Delhi',
  });
  assert.equal(duplicateResult.isAllowed, false);
  assert.ok(duplicateResult.rejectionReason?.includes('manipulative doorway pages'));

  // 6c: Genuine differentiated page in confirmed area
  const genuineResult = await editor.validateLocalPageAgainstDoorways({
    siteId,
    targetCityOrArea: 'Noida',
    serviceFocus: 'High-Rise Apartment Booster Pumps',
    slug: 'noida-high-rise-water-pumps',
    differentiatedOfferings: [
      'Multi-stage centrifugal booster pump replacement for Sector 62 high-rise condominiums',
      'Pressure testing certified for up to 30-story residential towers',
    ],
    confirmedPremisesOrServiceArea: 'Noida Sector 62',
    customBioOrIntro: 'Specialized hydraulic pump engineering for residential apartment complexes in Noida.',
  });
  assert.equal(genuineResult.isAllowed, true);
  assert.equal(genuineResult.differentiatedFactVerified, true);

  console.log('Prompt 082 verified successfully!\n');
}

runSiteEditorTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
