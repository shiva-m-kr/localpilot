import { createHash, randomUUID } from 'crypto';
import assert from 'assert';
import { WordPressPublishPipeline, WordPressPublishRequest } from '../packages/domain/src/wordpressPublishPipeline.js';
import { BudgetService } from '../packages/domain/src/budgetService.js';
import { ApprovalRequiredError, StaleRevisionError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 046: Complete the first scheduled WordPress vertical slice...');

  WordPressPublishPipeline.reset();
  const orgId = randomUUID();
  const locId = randomUUID();
  const draftId = randomUUID();

  BudgetService.setTenantAllowance(orgId, 100);

  const title = 'Emergency Roof Tarping Guide Austin';
  const content = '<p>Follow these steps to prevent water damage before our crew arrives.</p>';
  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ title, content }))
    .digest('hex');

  const baseReq: WordPressPublishRequest = {
    organizationId: orgId,
    locationId: locId,
    draftId,
    revisionNumber: 1,
    payloadHash,
    title,
    content,
    isPaused: false,
    hasActiveConsent: true,
    credentials: {
      siteUrl: 'https://apexroofing.example.com',
      username: 'apex_admin',
      applicationPassword: 'app-pass-secret-xyz'
    }
  };

  // 1. Pause Guard: paused location blocks publish
  assert.rejects(
    async () => {
      await WordPressPublishPipeline.executePublishSlice({
        ...baseReq,
        isPaused: true
      });
    },
    (err: any) => err instanceof ApprovalRequiredError,
    'Paused location must block publishing'
  );
  console.log('✓ Location pause guard blocks unsent work');

  // 2. Consent Guard: revoked consent blocks publish
  assert.rejects(
    async () => {
      await WordPressPublishPipeline.executePublishSlice({
        ...baseReq,
        hasActiveConsent: false
      });
    },
    (err: any) => err instanceof ApprovalRequiredError,
    'Revoked consent must block publishing'
  );
  console.log('✓ Revoked consent blocks unsent work');

  // 3. Stale revision / content mismatch blocks publish
  assert.rejects(
    async () => {
      await WordPressPublishPipeline.executePublishSlice({
        ...baseReq,
        title: 'Tampered Title Not In Approved Hash'
      });
    },
    (err: any) => err instanceof StaleRevisionError,
    'Mismatched content must throw StaleRevisionError'
  );
  console.log('✓ Stale revision guard prevents dispatching tampered payload');

  // 4. First successful vertical slice publication with readback
  const firstOutcome = await WordPressPublishPipeline.executePublishSlice(baseReq);
  assert(firstOutcome.externalId, 'Must return external ID');
  assert.strictEqual(firstOutcome.verifiedViaReadback, true, 'Must verify via readback');
  assert.strictEqual(firstOutcome.isDuplicateCall, false);
  console.log(`✓ First vertical slice published and verified via readback (External ID: ${firstOutcome.externalId})`);

  // 5. Idempotent duplicate command delivery
  const duplicateOutcome = await WordPressPublishPipeline.executePublishSlice(baseReq);
  assert.strictEqual(duplicateOutcome.isDuplicateCall, true, 'Duplicate command must be flagged');
  assert.strictEqual(duplicateOutcome.externalId, firstOutcome.externalId, 'Must return same external ID');
  console.log('✓ Duplicate logical command safely de-duplicated without re-posting or re-billing');

  // 6. Later edits use stored external ID
  const editedTitle = 'Emergency Roof Tarping Guide Austin - Updated';
  const editedContent = '<p>Updated inspection checklist with hail damage photos.</p>';
  const editedHash = createHash('sha256')
    .update(JSON.stringify({ title: editedTitle, content: editedContent }))
    .digest('hex');

  const updateReq: WordPressPublishRequest = {
    ...baseReq,
    revisionNumber: 2,
    payloadHash: editedHash,
    title: editedTitle,
    content: editedContent,
    existingExternalPostId: firstOutcome.externalId // Pass stored external ID!
  };

  const updateOutcome = await WordPressPublishPipeline.executePublishSlice(updateReq);
  assert.strictEqual(updateOutcome.externalId, firstOutcome.externalId, 'Update must target existing external ID');
  assert.strictEqual(updateOutcome.verifiedViaReadback, true, 'Updated post must be verified via readback');
  console.log('✓ Subsequent revision safely updated existing post using stored external ID');

  console.log('Prompt 046 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
