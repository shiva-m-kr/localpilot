import assert from 'node:assert/strict';
import {
  SeoFixRollbackService,
  SeoFixStorage,
  AuditIssue,
  SeoFixProposal,
} from '@localpilot/domain';

async function runSeoFixRollbackTests() {
  console.log('--- Testing Safe SEO Fix Proposals and Rollback (Prompt 087) ---');

  const siteId = '11111111-2222-3333-4444-555555555555';
  const userId = '00000000-0000-0000-0000-000000000001';

  const proposalMap = new Map<string, SeoFixProposal>();
  const snapshotMap = new Map<string, Record<string, any>>();
  const pageMetaMap = new Map<string, { title?: string; metaDescription?: string; canonical?: string }>([
    ['https://apexplumbing.example.com/', { title: 'Apex Plumbing Old Title' }],
  ]);

  let simulateReadbackFailure = false;

  const mockStorage: SeoFixStorage = {
    async getProposalById(id: string) {
      return proposalMap.get(id) || null;
    },
    async saveProposal(proposal: SeoFixProposal) {
      proposalMap.set(proposal.id, { ...proposal });
    },
    async createSnapshot(_sId: string, _url: string, data: Record<string, any>) {
      const snapId = `snap-${Date.now()}`;
      snapshotMap.set(snapId, { ...data });
      return snapId;
    },
    async getSnapshot(snapId: string) {
      return snapshotMap.get(snapId) || null;
    },
    async getPageMetadata(_sId: string, url: string) {
      return pageMetaMap.get(url) || null;
    },
    async updatePageMetadata(_sId: string, url: string, updates: any) {
      if (simulateReadbackFailure) {
        // Do not update metadata to simulate storage/render readback failure
        return;
      }
      pageMetaMap.set(url, { ...updates });
    },
  };

  const service = new SeoFixRollbackService(mockStorage);

  const missingCanonicalIssue: AuditIssue = {
    id: 'iss-canon-1',
    category: 'CANONICAL',
    severity: 'WARNING',
    title: 'Missing Canonical Tag',
    description: 'Page lacks self-referencing canonical tag.',
    pageUrl: 'https://apexplumbing.example.com/',
    recommendation: 'Add self canonical tag.',
    isAutoFixable: true,
  };

  // Test 1: Hosted Site Fix Proposal
  console.log('Test 1: Create hosted site fix proposal');
  const proposal1 = await service.createProposal(
    missingCanonicalIssue,
    siteId,
    'HOSTED_LOCALPILOT',
    { title: 'Apex Plumbing Old Title' }
  );
  assert.equal(proposal1.proposalType, 'ADD_CANONICAL');
  assert.equal(proposal1.fieldToUpdate, 'canonical');
  assert.equal(proposal1.proposedValue, 'https://apexplumbing.example.com/');
  assert.equal(proposal1.status, 'PENDING_REVIEW');

  // Test 2: External WordPress Fix Proposal provides manual steps (NO arbitrary PHP)
  console.log('Test 2: External WordPress site generates manual instructions');
  const wpProposal = await service.createProposal(
    missingCanonicalIssue,
    siteId,
    'EXTERNAL_WORDPRESS',
    { title: 'Apex Plumbing Old Title' }
  );
  assert.equal(wpProposal.status, 'MANUAL_INSTRUCTIONS_PROVIDED');
  assert.ok(wpProposal.manualSteps && wpProposal.manualSteps.length >= 4);
  assert.ok(wpProposal.manualSteps[0].includes('WordPress Admin dashboard'));

  // Test 3: Apply fix with consent, snapshot, and readback verification
  console.log('Test 3: Apply fix with consent, snapshot, and verified readback');
  const applied = await service.applyFixWithSnapshot(proposal1.id, siteId, userId, true);
  assert.equal(applied.status, 'APPLIED');
  assert.equal(applied.readbackVerified, true);
  assert.ok(applied.snapshotId);

  const currentMeta = await mockStorage.getPageMetadata(siteId, 'https://apexplumbing.example.com/');
  assert.equal(currentMeta?.canonical, 'https://apexplumbing.example.com/');

  // Test 4: Rollback restores pre-fix snapshot perfectly
  console.log('Test 4: Rollback restores pre-fix snapshot');
  const rolledBack = await service.rollbackFix(proposal1.id, siteId, userId);
  assert.equal(rolledBack.status, 'ROLLED_BACK');

  const metaAfterRollback = await mockStorage.getPageMetadata(siteId, 'https://apexplumbing.example.com/');
  assert.equal(metaAfterRollback?.canonical, undefined, 'Canonical tag was rolled back to previous state');

  // Test 5: Readback verification failure handling (never claim false success)
  console.log('Test 5: Readback failure detection reverts immediately to FAILED_VERIFICATION');
  const proposal2 = await service.createProposal(
    missingCanonicalIssue,
    siteId,
    'HOSTED_LOCALPILOT',
    {}
  );
  simulateReadbackFailure = true; // Inject failure

  const failedApply = await service.applyFixWithSnapshot(proposal2.id, siteId, userId, true);
  assert.equal(failedApply.status, 'FAILED_VERIFICATION');
  assert.equal(failedApply.readbackVerified, false);

  console.log('Prompt 087 verified successfully!\n');
}

runSeoFixRollbackTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
