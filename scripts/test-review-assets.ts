import { ReviewAssetService } from '../packages/domain/src/reviewAssetService.js';

console.log('--- Testing Prompt 077: Neutral Review Links and QR Assets ---');

const confirmedPlaceId = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const locationId = 'loc_store_internal_uuid_999';

// 1. Generate verified review assets
const assets = ReviewAssetService.generateReviewAssets({
  locationId,
  confirmedPlaceId,
  businessName: 'Apex Plumbing Experts'
});

console.log('✓ Direct Google Review URL generated:', assets.directGoogleReviewUrl);
if (!assets.directGoogleReviewUrl.includes(`placeid=${confirmedPlaceId}`)) {
  throw new Error('Direct review URL does not contain confirmed Google Place ID');
}

// 2. Acceptance check: QR assets do NOT leak internal IDs
console.log('✓ QR SVG generated (length:', assets.qrAssetSvg.length, 'bytes)');
if (assets.qrAssetSvg.includes(locationId)) {
  throw new Error('QR code leaked internal database location ID!');
}
if (!assets.complianceChecks.noInternalIdsLeaked) {
  throw new Error('Compliance check failed: Internal IDs leaked');
}

// 3. Acceptance check: Neutral invitation templates
console.log('✓ Receipt template:', assets.neutralInvitationCopyTemplates.receipt);
if (assets.neutralInvitationCopyTemplates.receipt.includes('5 stars') || assets.neutralInvitationCopyTemplates.receipt.includes('discount')) {
  throw new Error('Default template contains non-neutral language');
}

// 4. Acceptance check: Custom copy validation catches review gating
const gatedCopy = 'If you loved our service, leave a 5 star review on Google! If you had a problem, contact us privately.';
const gateValidation = ReviewAssetService.validateCustomCopy(gatedCopy);

console.log('✓ Gated copy validation result:', gateValidation.isCompliant, 'Violations:', gateValidation.violations);
if (gateValidation.isCompliant) {
  throw new Error('Failed to flag review gating violation');
}

// 5. Acceptance check: Prohibited incentives validation
const incentivizedCopy = 'Leave an honest review on Google and get 20% off your next drain cleaning!';
const incentiveValidation = ReviewAssetService.validateCustomCopy(incentivizedCopy);

console.log('✓ Incentivized copy validation result:', incentiveValidation.isCompliant, 'Violations:', incentiveValidation.violations);
if (incentiveValidation.isCompliant) {
  throw new Error('Failed to flag prohibited incentive violation');
}

// 6. Acceptance check: Rating demand validation
const demandCopy = 'Please give us 5 stars on Google to support our local business.';
const demandValidation = ReviewAssetService.validateCustomCopy(demandCopy);

console.log('✓ Demand copy validation result:', demandValidation.isCompliant, 'Violations:', demandValidation.violations);
if (demandValidation.isCompliant) {
  throw new Error('Failed to flag rating demand violation');
}

console.log('✓ All Prompt 077 tests passed successfully!');
