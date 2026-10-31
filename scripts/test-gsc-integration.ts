import assert from 'assert';
import { SearchConsoleAdapter } from '@localpilot/integrations';

async function runTest() {
  console.log('--- RUNNING PROMPT 032: SEARCH CONSOLE & OBSERVED METRICS VERIFICATION ---');

  const adapter = new SearchConsoleAdapter();
  const creds = { accessToken: 'valid-gsc-oauth-token' };

  // 1. List authorized properties
  const properties = await adapter.listAuthorizedProperties(creds);
  assert.strictEqual(properties.length, 2);
  assert.strictEqual(properties[0].siteUrl, 'sc-domain:apexplumbing.example.com');
  console.log('✓ Discovered authorized Search Console properties.');

  // 2. Reject queries for unauthorized properties
  await assert.rejects(
    async () => {
      await adapter.querySearchAnalytics(creds, {
        siteUrl: 'https://unauthorized-competitor.example.com',
        startDate: '2026-10-01',
        endDate: '2026-10-28'
      });
    },
    (err: any) => {
      assert.ok(err.message.includes('Unauthorized: property'));
      return true;
    }
  );
  console.log('✓ Enforced property ownership check: unauthorized properties rejected.');

  // 3. Query observed search analytics
  const result = await adapter.querySearchAnalytics(creds, {
    siteUrl: 'sc-domain:apexplumbing.example.com',
    startDate: '2026-10-01',
    endDate: '2026-10-28',
    dimensions: ['query', 'page'],
    rowLimit: 10
  });

  assert.strictEqual(result.isObservedData, true);
  assert.strictEqual(result.measurementWindow.start, '2026-10-01');
  assert.strictEqual(result.measurementWindow.end, '2026-10-28');
  assert.strictEqual(result.positionType, 'WEB_SERP_AVERAGE_POSITION');
  assert.ok(result.lagNote.includes('48-72h publication delay'));
  assert.strictEqual(result.rows.length, 3);

  // Check row metrics: clicks, impressions, ctr, position
  const row1 = result.rows[0];
  assert.strictEqual(row1.keys[0], 'emergency plumber north york');
  assert.strictEqual(row1.clicks, 84);
  assert.strictEqual(row1.impressions, 1120);
  assert.strictEqual(row1.position, 3.4);
  console.log('✓ Ingested search analytics with truthful measurement window and web SERP position separation.');

  // 4. Evidence fetch returns 28-day observed metrics
  const evidence = await adapter.fetchEvidence(creds, {});
  assert.strictEqual(evidence[0].metricName, 'organic_search_clicks');
  assert.strictEqual(evidence[0].windowDays, 28);
  console.log('✓ Ingested evidence records for Search Console telemetry.');

  console.log('--- PROMPT 032 VERIFIED SUCCESSFULLY ---');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
