import assert from 'assert';
import { GbpAdapter } from '@localpilot/integrations';

async function runTest() {
  console.log('--- RUNNING PROMPT 031: GBP & AUTHORIZED LOCATIONS VERIFICATION ---');

  const adapter = new GbpAdapter();
  const creds = { accessToken: 'valid-gbp-oauth-token' };

  // 1. Discover locations
  const locations = await adapter.discoverLocations(creds);
  assert.strictEqual(locations.length, 2);

  const locDowntown = locations[0];
  const locEastYork = locations[1];

  assert.strictEqual(locDowntown.verificationStatus, 'VERIFIED');
  assert.strictEqual(locEastYork.verificationStatus, 'NEEDS_VERIFICATION');
  console.log('✓ Discovered GBP locations with honest verification statuses (VERIFIED vs NEEDS_VERIFICATION).');

  // 2. Unselected location acceptance check: Attempt to publish to locDowntown before tenant selection
  await assert.rejects(
    async () => {
      await adapter.publish(creds, {
        itemId: 'post-1',
        title: 'Spring Special',
        content: 'Check out our AC tune-up services.',
        mediaUrls: [],
        mediaMimeTypes: [],
        locationId: locDowntown.locationId
      } as any);
    },
    (err: any) => {
      assert.ok(err.message.includes('has not been selected and authorized by the tenant'));
      return true;
    }
  );
  console.log('✓ Prevented actions on unselected locations.');

  // 3. Unverified location acceptance check: Even if selected, cannot publish while verification is pending
  adapter.setLocationAuthorization(locEastYork.locationId, true);
  await assert.rejects(
    async () => {
      await adapter.publish(creds, {
        itemId: 'post-2',
        title: 'Opening Soon',
        content: 'New depot opening in East York.',
        mediaUrls: [],
        mediaMimeTypes: [],
        locationId: locEastYork.locationId
      } as any);
    },
    (err: any) => {
      assert.ok(err.message.includes('verification status is NEEDS_VERIFICATION'));
      return true;
    }
  );
  console.log('✓ Unverified location honestly blocks publishing until owner completes Google verification.');

  // 4. Authorized and Verified Location publish
  adapter.setLocationAuthorization(locDowntown.locationId, true);
  const publishResult = await adapter.publish(creds, {
    itemId: 'post-3',
    title: 'Emergency Plumbing Active',
    content: '24/7 dispatched master plumbers in Downtown Toronto.',
    mediaUrls: [],
    mediaMimeTypes: [],
    locationId: locDowntown.locationId
  } as any);

  assert.strictEqual(publishResult.providerId, 'google_business_profile');
  assert.ok(publishResult.publishedUrl.includes(locDowntown.locationId));
  console.log('✓ Successfully published local post to authorized verified GBP location.');

  // 5. Evidence Fetching: Call & direction metrics
  const evidence = await adapter.fetchEvidence(creds, { locationId: locDowntown.locationId });
  assert.strictEqual(evidence.length, 2);
  assert.strictEqual(evidence[0].metricName, 'direct_phone_calls');
  assert.strictEqual(evidence[1].metricName, 'driving_directions_requests');
  console.log('✓ GBP observed telemetry (calls & driving directions) ingested truthfully.');

  // 6. Security Acceptance: Confirm no arbitrary proxy exists to Google API project
  assert.strictEqual((adapter as any).proxyGoogleApi, undefined);
  assert.strictEqual((adapter as any).executeArbitraryGbpCall, undefined);
  console.log('✓ Confirmed no generic programmatic proxy to Google Business Profile project.');

  console.log('--- PROMPT 031 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
