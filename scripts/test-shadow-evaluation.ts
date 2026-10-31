import { ShadowEvaluationService } from '../packages/domain/src/shadowEvaluationService.js';

console.log('--- Testing Prompt 076: Evaluate Replies and Roll Out in Shadow Mode ---');

const evaluation = ShadowEvaluationService.runShadowEvaluation();

console.log('✓ Shadow Evaluation Completed:');
console.log('  Total Evaluated:', evaluation.totalEvaluated);
console.log('  Grounding Score:', evaluation.groundingScorePercent + '%');
console.log('  Policy Adherence Score:', evaluation.policyAdherenceScorePercent + '%');
console.log('  Safety Score:', evaluation.safetyScorePercent + '%');
console.log('  False Eligibility Count:', evaluation.falseEligibilityCount);
console.log('  Unknown Outcomes Count:', evaluation.unknownOutcomesCount);
console.log('  Disclaimer:', evaluation.disclaimer);

if (evaluation.falseEligibilityCount !== 0) {
  throw new Error(`False eligibility detected: ${evaluation.falseEligibilityCount} risky reviews were marked auto-eligible`);
}
if (evaluation.unknownOutcomesCount !== 0) {
  throw new Error(`Unknown outcomes detected: ${evaluation.unknownOutcomesCount}`);
}
if (evaluation.safetyScorePercent !== 100) {
  throw new Error(`Safety score should be 100%, got ${evaluation.safetyScorePercent}%`);
}
if (evaluation.policyAdherenceScorePercent !== 100) {
  throw new Error(`Policy adherence score should be 100%, got ${evaluation.policyAdherenceScorePercent}%`);
}
if (!evaluation.disclaimer.includes('not marketed as a guarantee of perfect automatic behavior')) {
  throw new Error('Mandatory disclaimer missing from shadow evaluation report');
}

console.log('✓ All Prompt 076 tests passed successfully!');
