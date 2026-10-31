import assert from 'node:assert/strict';
import {
  OwnerReportsAgencyService,
  ReportStorage,
} from '@localpilot/domain';

async function runOwnerReportsAgencyTests() {
  console.log('--- Testing Owner Reports and Scoped Agency Workflows (Prompt 096) ---');

  const agencyTenantId = '00000000-0000-0000-0000-000000000001';
  const location1 = '00000000-0000-0000-0000-000000000011'; // Authorized with consent
  const location2 = '00000000-0000-0000-0000-000000000022'; // Foreign unauthorized location
  const location3 = '00000000-0000-0000-0000-000000000033'; // Authorized without consent

  const mockStorage: ReportStorage = {
    async verifyTenantAccess(tId: string, locId: string) {
      if (tId === agencyTenantId) {
        return locId === location1 || locId === location3;
      }
      return false;
    },
    async getLocationConsent(locId: string) {
      return locId === location1;
    },
    async getLocationActivities(_locId: string) {
      return {
        blogs: 4,
        social: 16,
        replies: 28,
        citations: 3,
        fixes: 2,
      };
    },
    async getObservedMetrics(_locId: string, startIso: string) {
      if (startIso.includes('10-01')) {
        return { searchImpressions: 12500, mapsInteractions: 340, leadEnquiries: 42 };
      }
      return { searchImpressions: 10000, mapsInteractions: 280, leadEnquiries: 35 };
    },
  };

  const service = new OwnerReportsAgencyService(mockStorage);

  // Test 1: Cross-client access denied
  console.log('Test 1: Cross-client access denied for unauthorized location');
  await assert.rejects(
    async () => {
      await service.generateReport(
        agencyTenantId,
        location2, // Unauthorized
        { startIso: '2026-10-01T00:00:00Z', endIso: '2026-10-31T23:59:59Z' },
        { startIso: '2026-09-01T00:00:00Z', endIso: '2026-09-30T23:59:59Z' }
      );
    },
    (err: any) => {
      assert.ok(err.message.includes('Access denied'));
      return true;
    }
  );

  // Test 2: Valid owner report with matched periods
  console.log('Test 2: Valid matched-period owner report');
  const report = await service.generateReport(
    agencyTenantId,
    location1,
    { startIso: '2026-10-01T00:00:00Z', endIso: '2026-10-31T23:59:59Z' },
    { startIso: '2026-09-01T00:00:00Z', endIso: '2026-09-30T23:59:59Z' }
  );

  assert.equal(report.activitySummary.blogsPublished, 4);
  assert.equal(report.activitySummary.reviewsReplied, 28);
  assert.equal(report.metrics.length, 3);
  assert.equal(report.metrics[0].changePercentage, 25.0); // (12500 - 10000) / 10000 * 100
  assert.ok(report.honestAttributionNotice.includes('Correlation does not imply direct causal attribution') || report.honestAttributionNotice.includes('correlate with optimization work'));

  // Test 3: CSV Export
  console.log('Test 3: Sanitized CSV Export');
  const csv = service.generateCsvExport(report);
  assert.ok(csv.includes('Search Console Organic Impressions'));
  assert.ok(csv.includes('25%'));
  assert.ok(csv.includes('"Blog Posts Published",4'));

  // Test 4: Agency Bulk Actions with granular permission and consent
  console.log('Test 4: Agency bulk actions with per-location permission and consent gating');
  const bulkResult = await service.executeAgencyBulkAction(
    agencyTenantId,
    [location1, location2, location3],
    'SCHEDULE_HOLIDAY_HOURS',
    5
  );

  assert.equal(bulkResult.totalLocations, 3);
  assert.equal(bulkResult.successfulLocations, 1);
  assert.equal(bulkResult.failedOrSkippedLocations, 2);
  assert.equal(bulkResult.totalCreditsSpent, 5, 'Only authorized consenting location charged credits');

  const item1 = bulkResult.items.find(i => i.locationId === location1);
  assert.equal(item1?.status, 'COMPLETED');

  const item2 = bulkResult.items.find(i => i.locationId === location2);
  assert.equal(item2?.status, 'PERMISSION_DENIED');

  const item3 = bulkResult.items.find(i => i.locationId === location3);
  assert.equal(item3?.status, 'CONSENT_MISSING');

  console.log('Prompt 096 verified successfully!\n');
}

runOwnerReportsAgencyTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
