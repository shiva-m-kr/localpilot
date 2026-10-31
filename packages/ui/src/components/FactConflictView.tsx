import React from 'react';
import { designTokens } from '../tokens.js';
import { Button } from './Button.js';
import { StatusBadge } from './StatusBadge.js';
import { FactConflictRecord, DownstreamDraftWarning } from '@localpilot/contracts';

export interface FactConflictViewProps {
  conflicts: FactConflictRecord[];
  flaggedDrafts: DownstreamDraftWarning[];
  onAcceptImported: (conflictId: string) => void;
  onRetainConfirmed: (conflictId: string) => void;
}

export const FactConflictView: React.FC<FactConflictViewProps> = ({
  conflicts,
  flaggedDrafts,
  onAcceptImported,
  onRetainConfirmed
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Downstream Stale Drafts Warning Banner */}
      {flaggedDrafts.length > 0 ? (
        <div
          role="alert"
          style={{
            padding: '16px 20px',
            borderRadius: designTokens.radii.card,
            backgroundColor: '#fff7ed',
            border: `1px solid ${designTokens.colors.warning}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: designTokens.colors.action }}>
            <span>⚠️</span> Critical Facts Changed: {flaggedDrafts.length} Downstream Drafts Need Review
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: designTokens.colors.textSecondary, lineHeight: '20px' }}>
            The following scheduled content items were approved under an earlier version of your business facts. They have been locked from publication until re-approved.
          </p>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: designTokens.colors.ink }}>
            {flaggedDrafts.map((d) => (
              <li key={d.draftId}>
                <strong>{d.draftTitle}</strong> ({d.channel}) — Approved at v{d.approvedAtFactsVersion}, current is v{d.currentFactsVersion}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Side-by-side Conflict Resolution List */}
      <div>
        <h3
          style={{
            fontFamily: designTokens.typography.fontDisplay,
            fontSize: '18px',
            fontWeight: 700,
            margin: '0 0 12px 0',
            color: designTokens.colors.ink
          }}
        >
          Fact Conflict Resolution ({conflicts.length} Unresolved)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: designTokens.colors.textSecondary }}>
          Imported facts from your website or profile differ from your confirmed values. Conflicting imports never overwrite your confirmed data automatically.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {conflicts.map((c) => (
            <div
              key={c.conflictId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: designTokens.radii.card,
                border: `1px solid ${designTokens.colors.border}`,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: designTokens.colors.ink }}>
                  Field: {c.key} ({c.category})
                </span>
                <StatusBadge
                  status={c.conflictType === 'HARMLESS_FORMATTING' ? 'draft' : 'needs_review'}
                  label={c.conflictType === 'HARMLESS_FORMATTING' ? 'Formatting Only' : 'Actual Disagreement'}
                />
              </div>

              {/* Side-by-Side comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: designTokens.radii.control, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                    CURRENT CONFIRMED VALUE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: designTokens.colors.ink }}>
                    {c.currentConfirmedValue}
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: designTokens.radii.control, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
                    UNCONFIRMED IMPORTED VALUE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: designTokens.colors.ink }}>
                    {c.importedValue}
                  </div>
                  <div style={{ fontSize: '11px', color: designTokens.colors.textMuted, marginTop: '4px' }}>
                    Source: {c.sourceUrl}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="secondary" size="sm" onClick={() => onRetainConfirmed(c.conflictId)}>
                  Keep Confirmed Value
                </Button>
                <Button variant="primary" size="sm" onClick={() => onAcceptImported(c.conflictId)}>
                  Accept &amp; Update Confirmed Value
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
