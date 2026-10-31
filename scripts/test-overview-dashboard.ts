import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverviewDashboard } from '@localpilot/ui';

console.log('--- RUNNING PROMPT 020: HONEST OVERVIEW DASHBOARD VERIFICATION ---');

// 1. Render Dashboard with disconnected Google Search Console and demo fixture active
const markup = renderToStaticMarkup(
  React.createElement(OverviewDashboard, {
    organizationName: 'Acme Heating & Air',
    locationName: 'North Metro Branch',
    isAutomationPaused: false,
    isDemoData: true,
    gscConnected: false, // Disconnected GSC
    gbpConnected: true,
    wordpressConnected: true,
    metaConnected: false,
    creditsUsed: 145,
    creditsLimit: 500,
    onNavigateTo: () => {},
    onConnectProvider: () => {},
    onToggleAutomationPause: () => {}
  })
);

// 2. Acceptance check: Demo fixture alert is present
assert.ok(markup.includes('DEMO DATA FIXTURE'));
assert.ok(markup.includes('Illustrative Only'));
console.log('✓ Demo data fixture clearly labeled without misleading assertions.');

// 3. Acceptance check: Missing connections display a connection action rather than misleading "0"
assert.ok(markup.includes('Connect Search Console'));
assert.ok(markup.includes('Not connected. Connect Search Console to view verified click telemetry.'));
console.log('✓ Disconnected integration displays proactive connection action rather than misleading zero metrics.');

// 4. Acceptance check: Metrics explicitly name source and window
assert.ok(markup.includes('Local Grid 7x7 Sample'));
assert.ok(markup.includes('Observed: 2 days ago'));
assert.ok(markup.includes('Direct Website &amp; GBP Call Actions'));
assert.ok(markup.includes('30-day window'));
console.log('✓ Observed telemetry metrics name truthful sources and measurement windows.');

// 5. Acceptance check: Review-first automation status and pause controls
assert.ok(markup.includes('REVIEW-FIRST MODE'));
assert.ok(markup.includes('Pause Automation'));
console.log('✓ Review-First automation mode and persistent pause controls surfaced.');

// 6. Acceptance check: Attention queue surfaces actionable items
assert.ok(markup.includes('Website Fact Conflict: Operating Hours Disagreement'));
assert.ok(markup.includes('Review Needed: 2 Social Updates Scheduled for Friday'));
assert.ok(markup.includes('GBP OAuth token expires in 5 days'));
console.log('✓ Attention queue separates urgent operational tasks from marketing vanity.');

// 7. Render Dashboard with Automation Paused
const pausedMarkup = renderToStaticMarkup(
  React.createElement(OverviewDashboard, {
    organizationName: 'Acme Heating & Air',
    locationName: 'North Metro Branch',
    isAutomationPaused: true,
    isDemoData: false,
    gscConnected: true,
    gbpConnected: true,
    wordpressConnected: true,
    metaConnected: true,
    creditsUsed: 490,
    creditsLimit: 500,
    onNavigateTo: () => {},
    onConnectProvider: () => {},
    onToggleAutomationPause: () => {}
  })
);

assert.ok(pausedMarkup.includes('AUTOMATION PAUSED'));
assert.ok(pausedMarkup.includes('Resume Automation'));
assert.ok(!pausedMarkup.includes('DEMO DATA FIXTURE')); // Live mode
console.log('✓ Automation paused state and live mode verified.');

console.log('--- PROMPT 020 VERIFIED SUCCESSFULLY ---');
