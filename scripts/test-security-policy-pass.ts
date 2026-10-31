import assert from 'node:assert/strict';
import {
  SecurityAuditPassService,
} from '@localpilot/domain';

async function runSecurityPolicyPassTests() {
  console.log('--- Testing Independent Security and Policy Verification Pass (Prompt 097) ---');

  const securityService = new SecurityAuditPassService();
  const result = securityService.runComprehensiveSecurityPass();

  console.log(`Executed ${result.totalChecksCount} security checks.`);
  console.log(`Passed: ${result.passedChecksCount}, Failed: ${result.failedChecksCount}`);

  for (const check of result.checks) {
    console.log(`  [${check.passed ? 'PASS' : 'FAIL'}] ${check.category}: ${check.testCaseName}`);
    assert.equal(check.passed, true, `Security check failed: ${check.testCaseName}`);
  }

  assert.equal(result.failedChecksCount, 0, 'Zero security check failures permitted for production launch approval');
  assert.equal(result.isProductionLaunchApproved, true);

  console.log('Prompt 097 verified successfully!\n');
}

runSecurityPolicyPassTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
