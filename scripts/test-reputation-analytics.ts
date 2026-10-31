import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReputationAnalyticsService } from '../packages/domain/src/reputationAnalyticsService.js';
import { ReputationAnalyticsPage } from '../packages/ui/src/pages/ReputationAnalyticsPage.js';
import { ReviewResource, GeneratedReplyDraft } from '@localpilot/contracts';

console.log('--- Testing Prompt 080: Transparent Reputation Analytics ---');

// Mock data with sparse sample (<10 reviews)
const mockSparseReviews: ReviewResource[] = [
  {
    id: 'rev_1',
    organizationId: 'org_rep',
    locationId: 'loc_rep',
    provider: 'google_business_profile',
    externalResourceId: 'accounts/1/locations/1/reviews/1',
    reviewerName: 'Alice',
    rating: 5,
    comment: 'Great work',
    sourceRevision: 'rev_1',
    fetchedAt: '2026-10-20T10:00:00Z',
    expiresAt: '2026-11-19T10:00:00Z',
    existingReply: { comment: 'Thanks Alice!', updateTime: '2026-10-20T12:00:00Z' }, // 2h reply
    isDeleted: false,
    purgedAt: null
  },
  {
    id: 'rev_2',
    organizationId: 'org_rep',
    locationId: 'loc_rep',
    provider: 'google_business_profile',
    externalResourceId: 'accounts/1/locations/1/reviews/2',
    reviewerName: 'Bob',
    rating: 4,
    comment: 'Prompt repair',
    sourceRevision: 'rev_2',
    fetchedAt: '2026-10-21T08:00:00Z',
    expiresAt: '2026-11-20T08:00:00Z',
    existingReply: { comment: 'Thanks Bob!', updateTime: '2026-10-21T12:00:00Z' }, // 4h reply
    isDeleted: false,
    purgedAt: null
  }
];

const mockDrafts: GeneratedReplyDraft[] = [
  {
    draftId: 'd_1',
    reviewResourceId: 'rev_1',
    sourceRevisionHash: 'rev_1',
    text: 'Thanks Alice!',
    version: 1, // approved as-is
    requiresHumanReview: false,
    groundingVerification: { passedAllChecks: true } as any,
    status: 'APPROVED',
    createdAt: '2026-10-20T10:05:00Z',
    updatedAt: '2026-10-20T10:05:00Z'
  },
  {
    draftId: 'd_2',
    reviewResourceId: 'rev_2',
    sourceRevisionHash: 'rev_2',
    text: 'Thanks Bob! Edited by owner.',
    version: 2, // edited
    requiresHumanReview: false,
    groundingVerification: { passedAllChecks: true } as any,
    status: 'APPROVED',
    createdAt: '2026-10-21T08:05:00Z',
    updatedAt: '2026-10-21T08:10:00Z'
  }
];

// 1. Generate analytics report with official rating 4.8 / 150 reviews, but sample is 4.5 / 2 reviews
const report = ReputationAnalyticsService.generateReport({
  organizationId: 'org_rep',
  locationId: 'loc_rep',
  officialProviderRating: 4.8,
  officialProviderReviewCount: 150,
  accessibleReviews: mockSparseReviews,
  drafts: mockDrafts,
  startDateIso: '2026-10-01T00:00:00Z',
  endDateIso: '2026-10-31T00:00:00Z',
  recentVolumeShiftRatio: 3.2 // Volume spike anomaly
});

console.log('✓ Report generated:');
console.log('  Official Google Rating:', report.officialProviderRating, `(${report.officialProviderReviewCount} reviews)`);
console.log('  Sampled Window Average:', report.sampledWindow.sampleAverageRating, `(${report.sampledWindow.sampleSize} reviews)`);
console.log('  Is Sparse Data:', report.sampledWindow.isSparseData);
console.log('  Median Response Time:', report.knownResponseTime.medianResponseHours, 'hours');
console.log('  Edit Rate:', report.draftWorkflowStats.editRatePercent + '%');

// 2. Acceptance check: A sample average is NOT the official overall rating
if (report.officialProviderRating === report.sampledWindow.sampleAverageRating) {
  throw new Error('Official overall rating must not be conflated with sampled window average');
}

// 3. Acceptance check: Sparse data stays uncertain
if (!report.sampledWindow.isSparseData) {
  throw new Error('Expected isSparseData to be true for sample size 2 (<10)');
}
if (!report.sampledWindow.sparseDataConfidenceDisclaimer) {
  throw new Error('Sparse data must include confidence disclaimer');
}

// 4. Acceptance check: Anomaly flags do not accuse competitors of fraud
if (report.anomalies.length === 0) {
  throw new Error('Expected volume shift anomaly to be flagged');
}
for (const a of report.anomalies) {
  if (a.accusesOfFraud) {
    throw new Error('Violation of acceptance criteria: Anomaly flagged accused of fraud!');
  }
  if (a.description.toLowerCase().includes('fraud') || a.description.toLowerCase().includes('fake')) {
    throw new Error('Anomaly description must not allege fraud or fake reviews');
  }
}
console.log('✓ Anomaly safely recorded without fraud accusations:', report.anomalies[0].description);

// 5. Acceptance check: Render UI page and check anti-gating disclaimer
const html = renderToStaticMarkup(React.createElement(ReputationAnalyticsPage, { report }));

if (!html.includes('OFFICIAL GOOGLE RATING')) {
  throw new Error('UI must show official Google rating card');
}
if (!html.includes('SAMPLED WINDOW AVERAGE')) {
  throw new Error('UI must show sampled window average card');
}
if (!html.includes('Sparse Sample Notice')) {
  throw new Error('UI must render sparse sample notice when sample size < 10');
}
if (!html.includes('Rating arithmetic and sample distributions are analytical insights')) {
  throw new Error('UI must display anti-gating disclaimer');
}

console.log('✓ Reputation analytics UI rendered and verified');
console.log('✓ All Prompt 080 tests passed successfully!');
