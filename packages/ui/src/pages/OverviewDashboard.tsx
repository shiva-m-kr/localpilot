import React from 'react';
import { KpiCard } from '../components/KpiCard.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { CostFreshnessIndicator } from '../components/CostFreshnessIndicator.js';
import { UsageBar } from '../components/UsageBar.js';
import { IntegrationCard } from '../components/IntegrationCard.js';
import { Button } from '../components/Button.js';

export interface OverviewDashboardProps {
  organizationName: string;
  locationName: string;
  isAutomationPaused: boolean;
  isDemoData: boolean;
  gscConnected: boolean;
  gbpConnected: boolean;
  wordpressConnected: boolean;
  metaConnected: boolean;
  creditsUsed: number;
  creditsLimit: number;
  onNavigateTo: (module: string) => void;
  onConnectProvider?: (provider: string) => void;
  onToggleAutomationPause?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  organizationName,
  locationName,
  isAutomationPaused,
  isDemoData,
  gscConnected,
  gbpConnected,
  wordpressConnected,
  metaConnected,
  creditsUsed,
  creditsLimit,
  onNavigateTo,
  onConnectProvider,
  onToggleAutomationPause
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Demo Fixture Alert Banner */}
      {isDemoData && (
        <div
          role="status"
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--font-size-sm)',
            color: '#92400e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>
            <strong>DEMO DATA FIXTURE:</strong> Metrics and items shown below are illustrative fixtures for local plumbing operations until live accounts are connected.
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase' }}>
            Illustrative Only
          </span>
        </div>
      )}

      {/* Top Bar: Location + Automation Mode */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'var(--space-4)'
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0, color: 'var(--color-ink-default)' }}>
            Overview Dashboard
          </h1>
          <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-ink-muted)' }}>
            {organizationName} &bull; <strong>{locationName}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {isAutomationPaused ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <StatusBadge status="stale" label="AUTOMATION PAUSED" />
              <Button size="sm" variant="secondary" onClick={onToggleAutomationPause}>
                Resume Automation
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <StatusBadge status="pending" label="REVIEW-FIRST MODE" />
              <Button size="sm" variant="secondary" onClick={onToggleAutomationPause}>
                Pause Automation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Section with Honest Source/Window Metadata */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
            Observed Performance
          </h2>
          <CostFreshnessIndicator
            sourceName="Grid & Outbox Telemetry"
            observedAt="2026-10-30T10:00:00Z"
            creditsCost={0.04}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)'
          }}
        >
          {/* 1. Organic Search Clicks */}
          {gscConnected ? (
            <KpiCard
              title="Organic Search Clicks"
              value="412"
              periodText="28-day window"
              sourceText="Google Search Console API"
              changeDelta={{ percentage: 8.4, isPositive: true }}
            />
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-3)'
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                  Organic Search Clicks
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)', marginTop: 'var(--space-1)' }}>
                  Source: Google Search Console
                </div>
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-ink-muted)' }}>
                Not connected. Connect Search Console to view verified click telemetry.
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onConnectProvider?.('search_console')}
              >
                Connect Search Console
              </Button>
            </div>
          )}

          {/* 2. Sampled Maps Coverage */}
          <KpiCard
            title="Sampled Maps Coverage"
            value="68%"
            periodText="Observed: 2 days ago"
            sourceText="Local Grid 7x7 Sample"
            changeDelta={{ percentage: 4.2, isPositive: true }}
          />

          {/* 3. Customer Enquiries */}
          <KpiCard
            title="Customer Enquiries"
            value="34"
            periodText="30-day window"
            sourceText="Direct Website & GBP Call Actions"
            changeDelta={{ percentage: 12, isPositive: true }}
          />

          {/* 4. Verified Publications */}
          <KpiCard
            title="Published Content"
            value="12 items"
            periodText="30-day window"
            sourceText="LocalPilot Dispatched Outbox"
          />
        </div>
      </div>

      {/* Attention Queue */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
            Attention Queue (Requires Decision)
          </h2>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
            3 action items
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* Item 1: Fact Conflict */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                Website Fact Conflict: Operating Hours Disagreement
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
                Imported website claims Saturday 9AM–2PM, but confirmed GBP facts show Closed.
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onNavigateTo('facts')}>
              Review Conflict
            </Button>
          </div>

          {/* Item 2: Draft Approval */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                Review Needed: 2 Social Updates Scheduled for Friday
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
                Under Review-First policy, scheduled content will not publish without explicit owner approval.
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onNavigateTo('content')}>
              Review Drafts
            </Button>
          </div>

          {/* Item 3: Connection Health */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                Connection Reauthorization: Google Business Profile
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
                GBP OAuth token expires in 5 days. Re-authorize to maintain automated synchronization.
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onNavigateTo('connections')}>
              Reconnect
            </Button>
          </div>
        </div>
      </div>

      {/* Channel Connections & Health */}
      <div>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Active Integration Channels
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)'
          }}
        >
          <IntegrationCard
            id="gbp"
            name="Google Business Profile"
            category="Directory & Maps"
            isConnected={gbpConnected}
            accountLabel={gbpConnected ? 'Apex Plumbing & HVAC (Verified)' : 'Not Connected'}
            lastSyncText={gbpConnected ? '1 hour ago' : 'Never'}
            onConnect={() => onConnectProvider?.('google_business_profile')}
          />

          <IntegrationCard
            id="wordpress"
            name="WordPress Engine"
            category="CMS & Website"
            isConnected={wordpressConnected}
            accountLabel={wordpressConnected ? 'https://apexplumbing.example.com' : 'Not Connected'}
            lastSyncText={wordpressConnected ? '3 hours ago' : 'Never'}
            onConnect={() => onConnectProvider?.('wordpress')}
          />

          <IntegrationCard
            id="gsc"
            name="Google Search Console"
            category="Search Analytics"
            isConnected={gscConnected}
            accountLabel={gscConnected ? 'sc-domain:apexplumbing.example.com' : 'Not Connected'}
            lastSyncText={gscConnected ? 'Yesterday' : 'Never'}
            onConnect={() => onConnectProvider?.('search_console')}
          />

          <IntegrationCard
            id="meta"
            name="Meta Business (FB & IG)"
            category="Social Publishing"
            isConnected={metaConnected}
            accountLabel={metaConnected ? '@ApexPlumbingOfficial' : 'Not Connected'}
            lastSyncText={metaConnected ? '4 hours ago' : 'Never'}
            onConnect={() => onConnectProvider?.('meta')}
          />
        </div>
      </div>

      {/* Usage & Metered Quotas */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)'
        }}
      >
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
          Metered Usage &amp; Allowance
        </h2>
        <UsageBar
          label="Monthly Operation & Scan Credits"
          spent={creditsUsed}
          reserved={25}
          totalLimit={creditsLimit}
          unit="Credits"
        />
        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
          Credits reset on the 1st of each month. Additional packs can be reserved without changing plan tier.
        </div>
      </div>
    </div>
  );
};
