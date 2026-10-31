import assert from 'assert';
import crypto from 'crypto';
import {
  ConsentService,
  ApprovalRequiredError,
  StaleRevisionError,
  UnsupportedActionError
} from '@localpilot/domain';

async function runTest() {
  console.log('--- RUNNING PROMPT 025: VERSIONED CONSENT & APPROVAL POLICIES VERIFICATION ---');

  ConsentService.clear();

  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const postId = crypto.randomUUID();

  // 1. Grant consent for WordPress publishing in default 'review_first' mode
  ConsentService.grantConsent(tenantId, undefined, 'wordpress', 'publish_post', userId, 'review_first');

  const initialPayload = {
    title: 'Frozen Pipe Prevention Tips',
    body: 'Call our licensed plumbers before temperatures dip below zero.'
  };

  // 2. Default Review-First: Attempt dispatch before approval -> MUST fail with ApprovalRequiredError
  assert.throws(
    () => {
      ConsentService.validateDispatchAuthorization({
        organizationId: tenantId,
        provider: 'wordpress',
        actionType: 'publish_post',
        itemId: postId,
        currentPayload: initialPayload,
        currentFactsVersion: 1
      });
    },
    (err: any) => {
      assert.ok(err instanceof ApprovalRequiredError);
      assert.strictEqual(err.details?.reason, 'PENDING_OWNER_APPROVAL');
      return true;
    }
  );
  console.log('✓ Review-First policy blocks unapproved dispatch with ApprovalRequiredError.');

  // 3. Approve item at factsVersion = 1
  ConsentService.approveItem(tenantId, undefined, 'post', postId, initialPayload, 1, userId);

  // Now dispatch validation succeeds!
  assert.doesNotThrow(() => {
    ConsentService.validateDispatchAuthorization({
      organizationId: tenantId,
      provider: 'wordpress',
      actionType: 'publish_post',
      itemId: postId,
      currentPayload: initialPayload,
      currentFactsVersion: 1
    });
  });
  console.log('✓ Explicit owner approval permits dispatch.');

  // 4. Stale Revision: Content was edited after approval
  const editedPayload = {
    ...initialPayload,
    body: 'Call our plumbers for 50% discount!' // Unapproved change!
  };
  assert.throws(
    () => {
      ConsentService.validateDispatchAuthorization({
        organizationId: tenantId,
        provider: 'wordpress',
        actionType: 'publish_post',
        itemId: postId,
        currentPayload: editedPayload,
        currentFactsVersion: 1
      });
    },
    (err: any) => {
      assert.ok(err instanceof StaleRevisionError);
      assert.strictEqual(err.details?.reason, 'CONTENT_MODIFIED_AFTER_APPROVAL');
      return true;
    }
  );
  console.log('✓ Edited content detected: StaleRevisionError blocks dispatch until re-approved.');

  // 5. Stale Revision: Business facts version updated after approval (e.g. phone or hours changed)
  assert.throws(
    () => {
      ConsentService.validateDispatchAuthorization({
        organizationId: tenantId,
        provider: 'wordpress',
        actionType: 'publish_post',
        itemId: postId,
        currentPayload: initialPayload,
        currentFactsVersion: 2 // Stale facts!
      });
    },
    (err: any) => {
      assert.ok(err instanceof StaleRevisionError);
      assert.strictEqual(err.details?.reason, 'BUSINESS_FACTS_MODIFIED_AFTER_APPROVAL');
      return true;
    }
  );
  console.log('✓ Updated business facts version triggers StaleRevisionError.');

  // 6. Global and Channel Pause Controls
  ConsentService.setGlobalPause(tenantId, true);
  assert.throws(
    () => {
      ConsentService.validateDispatchAuthorization({
        organizationId: tenantId,
        provider: 'wordpress',
        actionType: 'publish_post',
        itemId: postId,
        currentPayload: initialPayload,
        currentFactsVersion: 1
      });
    },
    (err: any) => {
      assert.ok(err instanceof ApprovalRequiredError);
      assert.strictEqual(err.details?.reason, 'GLOBAL_PAUSE_ACTIVE');
      return true;
    }
  );
  ConsentService.setGlobalPause(tenantId, false); // Resume global
  console.log('✓ Global automation pause blocks dispatch.');

  // 7. Revocation blocks dispatch
  ConsentService.revokeConsent(tenantId, undefined, 'wordpress', 'publish_post');
  assert.throws(
    () => {
      ConsentService.validateDispatchAuthorization({
        organizationId: tenantId,
        provider: 'wordpress',
        actionType: 'publish_post',
        itemId: postId,
        currentPayload: initialPayload,
        currentFactsVersion: 1
      });
    },
    (err: any) => {
      assert.ok(err instanceof ApprovalRequiredError);
      assert.strictEqual(err.details?.reason, 'CONSENT_REVOKED_OR_MISSING');
      return true;
    }
  );
  console.log('✓ Revoked consent immediately blocks dispatch.');

  // 8. Subscription Upgrade Never Silently Enables Automation
  ConsentService.upgradeSubscription(tenantId, 'agency_unlimited');
  // Re-grant consent for checking mode
  const consentRecord = ConsentService.grantConsent(tenantId, undefined, 'meta', 'publish_post', userId);
  assert.strictEqual(consentRecord.mode, 'review_first'); // Remained review_first!
  console.log('✓ Subscription upgrade does not silently switch automation to auto-publish.');

  // 9. Strict Gating: GBP Recurring Actions remain disabled
  assert.throws(
    () => {
      ConsentService.validateDispatchAuthorization({
        organizationId: tenantId,
        provider: 'google_business_profile',
        actionType: 'recurring_weekly_update',
        itemId: 'gbp-rec-1',
        currentPayload: { text: 'Weekly special' },
        currentFactsVersion: 1
      });
    },
    (err: any) => {
      assert.ok(err instanceof UnsupportedActionError);
      return true;
    }
  );
  console.log('✓ Google Business Profile recurring automated actions strictly disabled.');

  console.log('--- PROMPT 025 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
