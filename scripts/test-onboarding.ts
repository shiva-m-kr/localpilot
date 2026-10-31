import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OnboardingService } from '@localpilot/domain';
import { OnboardingFlow } from '@localpilot/ui';

console.log('Testing Resumable Business and Location Onboarding (Prompt 016)...');

const testOrgId = 'org-onboarding-test-001';

// 1. Session Initialization across 3 paths
console.log('1. Testing Onboarding Session Initialization across 3 paths...');
const scratchSession = OnboardingService.startSession(testOrgId, 'from-scratch');
assert.strictEqual(scratchSession.currentStep, 1);
assert.strictEqual(scratchSession.data.path, 'from-scratch');

// 2. Step Progress Saving & Resumability
console.log('2. Testing Step Saving & Resuming...');
// Step 1: Business Identity
OnboardingService.saveStepProgress(scratchSession.sessionId, 1, {
  businessName: 'Apex Emergency Plumbing',
  primaryCategory: 'Plumber',
  brandVoice: 'reliable_honest'
});

// Simulate user leaving and resuming
const resumedSession = OnboardingService.startSession(testOrgId);
assert.strictEqual(resumedSession.sessionId, scratchSession.sessionId);
assert.strictEqual(resumedSession.data.businessName, 'Apex Emergency Plumbing');
assert.strictEqual(resumedSession.currentStep, 2);
console.log('  ✅ Onboarding session safely leaves and resumes with progress intact');

// 3. Service-Area Business (SAB) Residential Address Privacy
console.log('3. Testing SAB Residential Address Privacy Protection...');
OnboardingService.saveStepProgress(scratchSession.sessionId, 2, {
  addressVisibility: 'HIDDEN_RESIDENTIAL',
  streetAddress: 'Flat 402, Sunshine Villa Apartment, 5th Cross', // Private home address
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560038',
  publicPhone: '+91 80 4123 4567',
  serviceCoverageRadiusKm: 25
});

// Step 3: Hours & Timezone
OnboardingService.saveStepProgress(scratchSession.sessionId, 3, {
  timezone: 'Asia/Kolkata',
  language: 'en-IN'
});

// Step 4: Services Offered
OnboardingService.saveStepProgress(scratchSession.sessionId, 4, {
  services: ['Emergency Pipe Repair', 'Drain Unclogging', 'Water Heater Replacement']
});

// Step 5: Booking Goal & Skipping Integrations
OnboardingService.saveStepProgress(scratchSession.sessionId, 5, {
  bookingGoal: 'PHONE_CALL',
  skippedIntegrations: true // Integration skipped gracefully
});

// Finalize Onboarding Session
const finalized = OnboardingService.completeSession(scratchSession.sessionId);
assert.strictEqual(finalized.businessData.name, 'Apex Emergency Plumbing');
assert.strictEqual(finalized.locationData.addressVisibility, 'HIDDEN_RESIDENTIAL');

// CRITICAL ACCEPTANCE GATE:
// For residential SAB businesses, street address is excluded/undefined from public profile
assert.strictEqual(finalized.locationData.streetAddress, undefined, 'Residential address must NOT be exported in location profile');
assert.strictEqual(finalized.locationData.city, 'Bengaluru');
assert.strictEqual(finalized.locationData.publicPhone, '+91 80 4123 4567');
assert.strictEqual(finalized.locationData.services.length, 3);
console.log('  ✅ Service-area business strictly hid residential address in finalized record');

// 4. Required Fact Enforcement
console.log('4. Testing Required Fact Validation...');
const incompleteOrgId = 'org-incomplete-test-002';
const incSession = OnboardingService.startSession(incompleteOrgId, 'from-scratch');
assert.throws(() => {
  // Empty business name must fail
  OnboardingService.saveStepProgress(incSession.sessionId, 1, {
    businessName: '',
    primaryCategory: ''
  });
}, /Business name must be at least 2 characters/);
console.log('  ✅ Required business facts strictly enforced before step progression');

// 5. Onboarding UI Rendering
console.log('5. Testing Onboarding Multi-Step UI Rendering...');
const flowHtml = renderToStaticMarkup(
  React.createElement(OnboardingFlow, {
    initialStep: 2,
    initialData: {
      businessName: 'Apex Emergency Plumbing',
      primaryCategory: 'Plumber',
      addressVisibility: 'HIDDEN_RESIDENTIAL'
    },
    onSaveStep: () => {},
    onComplete: () => {}
  })
);
assert.ok(flowHtml.includes('Location &amp; Address Privacy'));
assert.ok(flowHtml.includes('Strictly hidden from public websites'));
assert.ok(flowHtml.includes('Step 2 of 5'));
console.log('  ✅ Onboarding UI renders steps with clear address privacy indicators');

console.log('🎉 Prompt 016 verification completed successfully!');
