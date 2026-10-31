import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ReputationInboxPage,
  ReputationInboxItem
} from '../packages/ui/src/pages/ReputationInboxPage.js';

console.log('--- Testing Prompt 069: Reputation Inbox and Review Detail UX ---');

const mockItems: ReputationInboxItem[] = [
  {
    id: 'item_1',
    locationId: 'loc_1',
    provider: 'google_business_profile',
    reviewerName: 'Jonathan Davis',
    rating: 5,
    comment: 'The team replaced our water heater rapidly. Highly recommend!',
    fetchedAt: '2026-10-12T08:00:00Z',
    expiresAt: '2026-11-11T08:00:00Z',
    status: 'draft',
    sentiment: 'positive',
    language: 'en',
    riskFlags: [],
    existingReply: null,
    draftReply: {
      id: 'draft_101',
      text: 'Thank you Jonathan! Glad we could replace your water heater promptly.',
      authorType: 'AI_ASSISTED',
      version: 1,
      isQueued: true
    },
    actionHistory: [
      { timestamp: '2026-10-12T08:05:00Z', action: 'Draft generated', actor: 'AI Worker' }
    ]
  },
  {
    id: 'item_2',
    locationId: 'loc_1',
    provider: 'google_business_profile',
    reviewerName: 'Sarah Conner',
    rating: 1,
    comment: 'Overpriced and rude dispatcher. Considering legal action.',
    fetchedAt: '2026-10-12T09:00:00Z',
    expiresAt: '2026-11-11T09:00:00Z',
    status: 'approval',
    sentiment: 'negative',
    language: 'en',
    riskFlags: ['SAFETY_LEGAL_RISK', 'COMPLAINT'],
    existingReply: null,
    draftReply: {
      id: 'draft_102',
      text: 'Sarah, we take your feedback seriously. Please call our general manager directly at our main line.',
      authorType: 'OWNER',
      version: 2,
      isQueued: true
    },
    actionHistory: [
      { timestamp: '2026-10-12T09:15:00Z', action: 'Flagged High Risk', actor: 'Safety Guard' }
    ]
  },
  {
    id: 'item_3',
    locationId: 'loc_1',
    provider: 'google_business_profile',
    reviewerName: 'Michael Chang',
    rating: 5,
    comment: 'Great emergency plumbing.',
    fetchedAt: '2026-10-10T08:00:00Z',
    expiresAt: '2026-11-09T08:00:00Z',
    status: 'verified',
    sentiment: 'positive',
    language: 'en',
    riskFlags: [],
    existingReply: {
      comment: 'Thanks Michael! Always here when plumbing emergencies occur.',
      updateTime: '2026-10-10T11:00:00Z'
    },
    draftReply: null,
    actionHistory: [
      { timestamp: '2026-10-10T11:00:00Z', action: 'Verified on Google', actor: 'Sync Poller' }
    ]
  }
];

// 1. Render Inbox with reply permission enabled
const htmlAuthorized = renderToStaticMarkup(
  React.createElement(ReputationInboxPage, {
    items: mockItems,
    canReply: true
  })
);

// Verify minimized personal details: "Jonathan Davis" -> "Jonathan D."
if (!htmlAuthorized.includes('Jonathan D.')) {
  throw new Error('Reviewer name should have minimized personal details (Jonathan D.)');
}
console.log('✓ Minimized personal details verified in review cards');

// Verify queued draft indicator
if (!htmlAuthorized.includes('NOT YET PUBLIC')) {
  throw new Error('Draft must clearly state NOT YET PUBLIC');
}
console.log('✓ Clear "NOT YET PUBLIC" queued draft badge verified');

// Verify distinct semantic status badges exist
if (!htmlAuthorized.includes('VERIFIED') || !htmlAuthorized.includes('DRAFT')) {
  throw new Error('Expected distinct status indicators in rendered markup');
}
console.log('✓ Distinct status indicators verified');

// 2. Render with reply permission disabled -> verify locked button / permission restriction
const htmlUnauthorized = renderToStaticMarkup(
  React.createElement(ReputationInboxPage, {
    items: mockItems,
    canReply: false
  })
);

if (htmlUnauthorized.includes('Approve &amp; Publish Response')) {
  throw new Error('Unauthorized view should not display active publish button');
}
console.log('✓ Permission gating verified: Unauthorized user cannot trigger publish actions');

console.log('✓ All Prompt 069 tests passed successfully!');
