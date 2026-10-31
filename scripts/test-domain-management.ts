import assert from 'node:assert/strict';
import {
  DomainManagementService,
  DomainStorage,
  DnsResolver,
  CustomDomainRecord,
} from '@localpilot/domain';

async function runDomainManagementTests() {
  console.log('--- Testing Subdomains, Verified Domains and HTTPS States (Prompt 083) ---');

  const tenant1 = '00000000-0000-0000-0000-000000000001';
  const tenant2 = '00000000-0000-0000-0000-000000000002';
  const location1 = '00000000-0000-0000-0000-000000000011';
  const site1 = '11111111-1111-1111-1111-111111111111';

  const domainMap = new Map<string, CustomDomainRecord>();
  const subdomainMap = new Map<string, any>([
    ['apexplumbing', { id: site1, tenantId: tenant1, location1, status: 'ACTIVE' }],
    ['pausedsite', { id: 'site-paused', tenantId: tenant1, location1, status: 'PAUSED' }],
  ]);

  const dnsTxtRecords = new Map<string, string[]>();
  const dnsCnameRecords = new Map<string, string[]>();

  const mockStorage: DomainStorage = {
    async getDomainById(id: string) {
      return domainMap.get(id) || null;
    },
    async getDomainByHostname(hostname: string) {
      for (const record of domainMap.values()) {
        if (record.hostname === hostname) return record;
      }
      return null;
    },
    async saveDomain(record: CustomDomainRecord) {
      domainMap.set(record.id, { ...record });
    },
    async getSiteBySubdomain(subdomain: string) {
      return subdomainMap.get(subdomain) || null;
    },
  };

  const mockDns: DnsResolver = {
    async resolveTxt(hostname: string) {
      return dnsTxtRecords.get(hostname) || [];
    },
    async resolveCname(hostname: string) {
      return dnsCnameRecords.get(hostname) || [];
    },
  };

  const service = new DomainManagementService(mockStorage, mockDns);

  // Test 1: Reject loopback or private hostnames
  console.log('Test 1: Reject private or loopback hostnames');
  await assert.rejects(
    async () => {
      await service.claimDomain({
        tenantId: tenant1,
        locationId: location1,
        siteId: site1,
        hostname: 'localhost',
        verificationMethod: 'TXT_CHALLENGE',
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('Cannot claim private or loopback host'));
      return true;
    }
  );

  // Test 2: Claim custom domain
  console.log('Test 2: Claim custom domain creates pending verification record');
  const claimed = await service.claimDomain({
    tenantId: tenant1,
    locationId: location1,
    siteId: site1,
    hostname: 'www.apexplumbingdelhi.com',
    verificationMethod: 'TXT_CHALLENGE',
  });
  assert.equal(claimed.hostname, 'www.apexplumbingdelhi.com');
  assert.equal(claimed.status, 'CLAIMED');
  assert.equal(claimed.tlsStatus, 'PENDING_VALIDATION');
  assert.ok(claimed.verificationToken.length >= 16);

  // Test 3: Second tenant cannot claim the same domain (Collision prevention)
  console.log('Test 3: Collision prevention - second tenant cannot claim same domain');
  await assert.rejects(
    async () => {
      await service.claimDomain({
        tenantId: tenant2,
        locationId: '00000000-0000-0000-0000-000000000022',
        siteId: 'site-2',
        hostname: 'www.apexplumbingdelhi.com',
        verificationMethod: 'TXT_CHALLENGE',
      });
    },
    (err: any) => {
      console.log('Caught error in Test 3:', err.message);
      assert.ok(err.message.includes('already claimed by another active tenant'));
      return true;
    }
  );

  // Test 4: DNS check failure
  console.log('Test 4: DNS check failure sets FAILED_DNS status');
  const failedDns = await service.verifyAndActivateDomain(claimed.id, tenant1);
  assert.equal(failedDns.status, 'FAILED_DNS');
  assert.ok(failedDns.failureReason?.includes('DNS challenge record not found'));

  // Test 5: Successful DNS verification, TLS issuance, health check and ACTIVE
  console.log('Test 5: DNS TXT match advances through TLS and Health Check to ACTIVE');
  dnsTxtRecords.set(claimed.expectedTxtRecord, [claimed.verificationToken]);

  const activated = await service.verifyAndActivateDomain(claimed.id, tenant1);
  assert.equal(activated.status, 'ACTIVE');
  assert.equal(activated.tlsStatus, 'ISSUED');
  assert.equal(activated.lastHealthCheckPassed, true);
  assert.ok(activated.activatedAt);

  // Test 6: Host Resolution
  console.log('Test 6: Host resolution routing');
  // 6a: Active custom domain
  const routeCustom = await service.resolveHost('www.apexplumbingdelhi.com');
  assert.equal(routeCustom.isAllowed, true);
  assert.equal(routeCustom.siteId, site1);
  assert.equal(routeCustom.isCustomDomain, true);

  // 6b: Unknown custom domain
  const routeUnknown = await service.resolveHost('random-unclaimed-domain.com');
  assert.equal(routeUnknown.isAllowed, false);
  assert.ok(routeUnknown.rejectionReason?.includes('not a registered custom domain'));

  // 6c: Active subdomain
  const routeSubdomain = await service.resolveHost('apexplumbing.localpilot.site');
  assert.equal(routeSubdomain.isAllowed, true);
  assert.equal(routeSubdomain.isCustomDomain, false);

  // 6d: Paused subdomain
  const routePaused = await service.resolveHost('pausedsite.localpilot.site');
  assert.equal(routePaused.isAllowed, false);
  assert.ok(routePaused.rejectionReason?.includes('PAUSED'));

  // Test 7: Domain release puts domain into safety quarantine
  console.log('Test 7: Release domain puts domain into quarantine to prevent dangling takeover');
  const released = await service.releaseDomain(claimed.id, tenant1);
  assert.equal(released.status, 'QUARANTINED');
  assert.ok(released.quarantinedUntil);

  // Tenant 2 cannot immediately hijack the quarantined domain
  await assert.rejects(
    async () => {
      await service.claimDomain({
        tenantId: tenant2,
        locationId: '00000000-0000-0000-0000-000000000022',
        siteId: 'site-2',
        hostname: 'www.apexplumbingdelhi.com',
        verificationMethod: 'TXT_CHALLENGE',
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('safety quarantine'));
      return true;
    }
  );

  console.log('Prompt 083 verified successfully!\n');
}

runDomainManagementTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
