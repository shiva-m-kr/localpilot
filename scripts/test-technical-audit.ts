import assert from 'node:assert/strict';
import {
  TechnicalAuditService,
  PageCrawlObservation,
} from '@localpilot/domain';

async function runTechnicalAuditTests() {
  console.log('--- Testing Bounded Technical and Conversion Audit (Prompt 086) ---');

  const auditService = new TechnicalAuditService();
  const siteId = '11111111-2222-3333-4444-555555555555';
  const targetUrl = 'https://apexplumbing.example.com';

  // Test 1: Page with multiple technical SEO issues
  console.log('Test 1: Identify technical issues (title, description, canonical, alt)');
  const page1: PageCrawlObservation = {
    url: 'https://apexplumbing.example.com/',
    statusCode: 200,
    headers: {},
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Apex Plumbing Services Delhi NCR - Best 24/7 Leak Repair and Drain Cleaning Services in South Delhi and Noida NCR Region</title>
        <!-- Missing meta description -->
        <!-- Missing rel="canonical" -->
      </head>
      <body>
        <!-- Missing H1 heading -->
        <h2>Welcome to Apex Plumbing</h2>
        <a href="tel:+919876543210">Call Us Now: +91 98765 43210</a>
        <a href="mailto:info@apexplumbing.example.com">Email Us</a>
        <a href="https://calendly.com/apexplumbing/booking">Book Appointment Online</a>
        <img src="/logo.png"> <!-- Missing alt -->
        <img src="/team.jpg" alt="Our certified technicians">
      </body>
      </html>
    `,
  };

  const report = await auditService.auditSite(siteId, targetUrl, [page1], 20);

  assert.equal(report.crawledPagesCount, 1);
  assert.ok(report.issues.some((i) => i.title === 'Page Title Too Long'), 'Long title must be flagged');
  assert.ok(report.issues.some((i) => i.title === 'Missing Meta Description'), 'Missing description must be flagged');
  assert.ok(report.issues.some((i) => i.title === 'Missing Canonical Tag'), 'Missing canonical must be flagged');
  assert.ok(report.issues.some((i) => i.title === 'Missing H1 Heading'), 'Missing H1 must be flagged');
  assert.ok(report.issues.some((i) => i.title.includes('Images Missing Alt Text')), 'Missing alt must be flagged');

  // Test 2: Conversion checks & External booking manual verification
  console.log('Test 2: Conversion destination checks (call, email, viewport, external booking)');
  assert.equal(report.conversionChecks.hasClickToCall, true);
  assert.equal(report.conversionChecks.clickToCallPhone, '+919876543210');
  assert.equal(report.conversionChecks.hasEmailContact, true);
  assert.equal(report.conversionChecks.hasMobileViewport, true);
  assert.equal(report.conversionChecks.bookingDestinationStatus, 'MANUAL_VERIFICATION_REQUIRED');
  assert.ok(
    report.conversionChecks.bookingVerificationNote.includes('Third-party scheduling service detected'),
    'External scheduler must trigger manual verification notice, not false completion'
  );

  // Test 3: Explainable score computation
  console.log('Test 3: Explainable scoring calculation');
  assert.ok(report.overallScore > 0 && report.overallScore < 100, `Score: ${report.overallScore}`);

  // Test 4: Bounded crawl page budget enforcement
  console.log('Test 4: Bounded crawl budget enforcement');
  const dummyPages: PageCrawlObservation[] = Array(25).fill(page1);
  await assert.rejects(
    async () => {
      await auditService.auditSite(siteId, targetUrl, dummyPages, 20); // Limit is 20, but provided 25
    },
    (err: any) => {
      assert.ok(err.message.includes('exceeded bounded budget'));
      return true;
    }
  );

  // Test 5: SSRF protection on target URL
  console.log('Test 5: SSRF protection prevents auditing loopback or cloud metadata');
  await assert.rejects(
    async () => {
      await auditService.auditSite(siteId, 'http://169.254.169.254/latest/meta-data', [page1], 20);
    },
    (err: any) => {
      assert.ok(err.message.includes('SSRF') || err.message.includes('private') || err.message.includes('cloud metadata') || err.message.includes('blocked'));
      return true;
    }
  );

  console.log('Prompt 086 verified successfully!\n');
}

runTechnicalAuditTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
