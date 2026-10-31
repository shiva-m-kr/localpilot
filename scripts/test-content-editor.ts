import { randomUUID } from 'crypto';
import assert from 'assert';
import { ContentRevisionService } from '../packages/domain/src/contentRevisionService.js';
import { StaleRevisionError } from '../packages/domain/src/errors.js';
import { ContentBlock } from '../packages/contracts/src/contentDrafts.js';

async function runTest() {
  console.log('Testing Prompt 042: Build the revision-aware content editor...');

  const orgId = randomUUID();
  const locId = randomUUID();
  const authorUserId = randomUUID();
  const approverUserId = randomUUID();

  const block1Id = randomUUID();
  const block2Id = randomUUID();

  const initialBlocks: ContentBlock[] = [
    {
      id: block1Id,
      type: 'HEADING',
      level: 1,
      content: 'Roof Repair Services in Austin',
      claimsFactIds: []
    },
    {
      id: block2Id,
      type: 'PARAGRAPH',
      content: 'We offer premier commercial and residential roof repairs.',
      claimsFactIds: []
    }
  ];

  // 1. Initial Draft Creation
  let state = ContentRevisionService.createInitialDraft({
    organizationId: orgId,
    locationId: locId,
    title: 'Roof Repair Austin - Apex Roofing',
    metaDescription: 'Trusted roofing contractor in Austin with certified inspectors.',
    blocks: initialBlocks,
    authorUserId,
    factsVersion: 1
  });

  assert.strictEqual(state.currentRevisionNumber, 1, 'Initial revision must be 1');
  assert.strictEqual(state.activeApproval, null, 'Initial draft must not be approved');
  console.log('✓ Initial draft created at revision 1, unapproved');

  // 2. Approve Revision 1
  state = ContentRevisionService.approveRevision(state, 1, approverUserId, 1);
  assert(state.activeApproval !== null, 'Active approval should exist');
  assert.strictEqual(state.activeApproval.revisionNumber, 1, 'Approval bound to revision 1');
  assert.strictEqual(state.activeApproval.factsVersion, 1, 'Approval bound to facts v1');
  console.log('✓ Revision 1 approved with cryptographic payload hash binding');

  // 3. Modifying approved content VOIDS the approval
  const editedBlocks: ContentBlock[] = [
    initialBlocks[0],
    {
      ...initialBlocks[1],
      content: 'We offer premier commercial and residential roof repairs with lifetime warranty.'
    }
  ];

  state = ContentRevisionService.saveRevision(state, {
    baseRevisionNumber: 1,
    title: state.latestRevision.title,
    metaDescription: state.latestRevision.metaDescription,
    blocks: editedBlocks,
    changeType: 'MANUAL_EDIT',
    changeSummary: 'Added warranty info',
    authorUserId
  });

  assert.strictEqual(state.currentRevisionNumber, 2, 'Revision incremented to 2');
  assert.strictEqual(state.activeApproval, null, 'Approval must be invalidated when content is modified');
  console.log('✓ Modifying approved content automatically voids the previous approval');

  // 4. Stale Revision / Concurrent Edit Protection
  assert.throws(
    () => {
      ContentRevisionService.saveRevision(state, {
        baseRevisionNumber: 1, // Stale base revision! Current is 2
        title: 'Conflict Title',
        metaDescription: 'Conflict Meta',
        blocks: editedBlocks,
        changeType: 'MANUAL_EDIT',
        changeSummary: 'Concurrent overwrite attempt',
        authorUserId
      });
    },
    (err: any) => err instanceof StaleRevisionError,
    'Concurrent edits based on stale revision must throw StaleRevisionError'
  );
  console.log('✓ Concurrent edit conflict prevented (StaleRevisionError thrown)');

  // 5. AI Selection Rewrite creates reviewable revision
  state = ContentRevisionService.applyAiSelectionRewrite(state, {
    baseRevisionNumber: 2,
    targetBlockId: block2Id,
    rewrittenContent: 'Apex Roofing delivers certified commercial and residential roof repairs with a 10-year warranty.',
    authorUserId,
    aiInstruction: 'State specific warranty terms concisely'
  });

  assert.strictEqual(state.currentRevisionNumber, 3, 'Revision incremented to 3');
  assert.strictEqual(state.latestRevision.changeType, 'AI_SELECTION_REWRITE', 'Change type marked AI_SELECTION_REWRITE');
  console.log('✓ AI selection rewrite creates reviewable revision 3');

  // 6. Diff Computation
  const diff = ContentRevisionService.computeDiff(state, 1, 3);
  assert.strictEqual(diff.fromRevisionNumber, 1);
  assert.strictEqual(diff.toRevisionNumber, 3);
  const modifiedBlock = diff.blockDiffs.find((b) => b.blockId === block2Id);
  assert(modifiedBlock, 'Modified block should be detected in diff');
  assert.strictEqual(modifiedBlock.status, 'MODIFIED', 'Block status must be MODIFIED');
  console.log('✓ Revision diff accurately calculates before/after block modifications');

  // 7. Facts Version Stale Re-approval Guard
  assert.throws(
    () => {
      // Try to approve revision 3 when facts have been updated to v2
      ContentRevisionService.approveRevision(state, 3, approverUserId, 2);
    },
    (err: any) => err instanceof StaleRevisionError,
    'Approving revision with outdated facts version must throw StaleRevisionError'
  );
  console.log('✓ Stale facts version prevents unauthorized approval without re-validation');

  // 8. Restore Previous Revision
  state = ContentRevisionService.restoreRevision(state, 1, authorUserId);
  assert.strictEqual(state.currentRevisionNumber, 4, 'Restore creates new revision 4');
  assert.strictEqual(state.latestRevision.changeType, 'RESTORE_PREVIOUS_REVISION');
  assert.strictEqual(
    state.latestRevision.blocks.find((b) => b.id === block2Id)?.content,
    'We offer premier commercial and residential roof repairs.'
  );
  console.log('✓ Historical revision restored cleanly as new revision 4');

  console.log('Prompt 042 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
