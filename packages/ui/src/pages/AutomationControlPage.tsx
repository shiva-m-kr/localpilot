import React, { useState } from 'react';
import {
  AutomationPolicy,
  KillSwitchScope,
  PolicyImpactPreview
} from '@localpilot/contracts';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { KpiCard } from '../components/KpiCard.js';

export interface AutomationControlPageProps {
  policy: AutomationPolicy;
  onToggleGlobalKillSwitch: () => void;
  onToggleChannelKillSwitch: (scope: KillSwitchScope) => void;
  onPreviewKillSwitch: (scope: KillSwitchScope) => PolicyImpactPreview;
}

export const AutomationControlPage: React.FC<AutomationControlPageProps> = ({
  policy,
  onToggleGlobalKillSwitch,
  onToggleChannelKillSwitch,
  onPreviewKillSwitch
}) => {
  const [preview, setPreview] = useState<PolicyImpactPreview | null>(null);

  const channels: { label: string; scope: KillSwitchScope }[] = [
    { label: 'WordPress Blog Publishing', scope: 'WORDPRESS' },
    { label: 'Google Business Profile Updates', scope: 'GBP' },
    { label: 'Meta Facebook Page Posting', scope: 'META_FACEBOOK' },
    { label: 'Instagram Professional Publishing', scope: 'META_INSTAGRAM' },
    { label: 'AI Content Drafting', scope: 'AI_GENERATION' }
  ];

  return (
    <div className="lp-automation-control" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Global Kill Switch Banner */}
      {policy.globalKillSwitchEngaged ? (
        <div
          role="alert"
          style={{
            background: '#FEF2F2',
            border: '2px solid #EF4444',
            borderRadius: '8px',
            padding: '18px 24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong style={{ fontSize: '18px', color: '#991B1B' }}>EMERGENCY KILL SWITCH ENGAGED</strong>
            <p style={{ margin: '4px 0 0 0', color: '#B91C1C', fontSize: '14px' }}>
              All automated background dispatches across all channels are immediately halted.
            </p>
          </div>
          <Button variant="danger" onClick={onToggleGlobalKillSwitch}>
            Resume All Automations
          </Button>
        </div>
      ) : (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong style={{ color: '#166534', fontSize: '16px' }}>Automations Healthy & Active</strong>
            <p style={{ margin: '4px 0 0 0', color: '#15803D', fontSize: '13px' }}>
              Publishing is running in <strong>Review-First Mode</strong>. All external writes require owner sign-off.
            </p>
          </div>
          <Button variant="danger" onClick={onToggleGlobalKillSwitch}>
            Engage Global Kill Switch
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <KpiCard
          title="Monthly Spend Cap"
          value={`$${policy.currentMonthSpentUsd.toFixed(2)} / $${policy.monthlySpendCapUsd.toFixed(2)}`}
          periodText="Cap Enforced"
        />
        <KpiCard
          title="Daily Spend Cap"
          value={`$${policy.dailySpendCapUsd.toFixed(2)} max`}
          periodText="Per 24h period"
        />
        <KpiCard
          title="Owner Edit Window"
          value={`${policy.ownerEditWindowMinutes} mins`}
          periodText="Grace period before dispatch"
        />
        <KpiCard
          title="Approval Policy"
          value={policy.autoPublishRequiresApproval ? 'Review-First' : 'Automatic'}
          periodText="Human sign-off required"
        />
      </div>

      {/* Selective Channel Kill Switches */}
      <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>Channel Kill Switches & Scope Control</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {channels.map((ch) => {
            const isPaused = policy.activeKillSwitches.includes(ch.scope);
            return (
              <div
                key={ch.scope}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: isPaused ? '#FEF2F2' : '#F9FAFB',
                  border: isPaused ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '14px', color: isPaused ? '#991B1B' : '#111827' }}>{ch.label}</strong>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    Status: {isPaused ? <span style={{ color: '#DC2626', fontWeight: 600 }}>Paused (Halted)</span> : <span style={{ color: '#16A34A', fontWeight: 600 }}>Active</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setPreview(onPreviewKillSwitch(ch.scope))}
                    aria-label={`Preview impact of pausing ${ch.label}`}
                  >
                    Preview Impact
                  </Button>
                  <Button
                    variant={isPaused ? 'primary' : 'danger'}
                    onClick={() => onToggleChannelKillSwitch(ch.scope)}
                  >
                    {isPaused ? 'Resume Channel' : 'Pause Channel'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Impact Preview Modal/Box */}
      {preview && (
        <div
          role="region"
          aria-label="Policy Impact Preview"
          style={{
            background: '#FFF7ED',
            border: '1px solid #FDBA74',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#C2410C', fontSize: '16px' }}>Policy Change Impact Analysis</strong>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close Preview
            </Button>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#9A3412' }}>{preview.summary}</p>
          <div style={{ fontSize: '13px', color: '#7C2D12' }}>
            <strong>Affected Job Count:</strong> {preview.affectedScheduledJobIds.length} • <strong>Reserved Budget Saved:</strong> ${preview.upcomingSavingsUsd.toFixed(2)} USD
          </div>
        </div>
      )}
    </div>
  );
};
