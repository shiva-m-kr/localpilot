import React from 'react';
import { designTokens } from '../tokens.js';

export interface UsageBarProps {
  label: string;
  spent: number;
  reserved: number;
  totalLimit: number;
  unit?: string;
}

export const UsageBar: React.FC<UsageBarProps> = ({
  label,
  spent,
  reserved,
  totalLimit,
  unit = 'credits'
}) => {
  const spentPct = Math.min(100, Math.round((spent / totalLimit) * 100));
  const reservedPct = Math.min(100 - spentPct, Math.round((reserved / totalLimit) * 100));
  const totalUsedPct = spentPct + reservedPct;

  const barColor =
    totalUsedPct >= 100
      ? designTokens.colors.danger
      : totalUsedPct >= 80
      ? designTokens.colors.warning
      : designTokens.colors.action;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontFamily: designTokens.typography.fontBody }}>
        <span style={{ fontWeight: 600, color: designTokens.colors.ink }}>{label}</span>
        <span style={{ color: designTokens.colors.textSecondary }}>
          {spent} spent {reserved > 0 ? `(+${reserved} held) ` : ''}/ {totalLimit} {unit} ({totalUsedPct}%)
        </span>
      </div>

      <div
        style={{
          height: '8px',
          width: '100%',
          backgroundColor: '#e5e7eb',
          borderRadius: designTokens.radii.pill,
          overflow: 'hidden',
          display: 'flex'
        }}
      >
        <div
          style={{
            width: `${spentPct}%`,
            backgroundColor: barColor,
            transition: 'width 0.3s ease'
          }}
        />
        {reservedPct > 0 ? (
          <div
            style={{
              width: `${reservedPct}%`,
              backgroundColor: designTokens.colors.brand300,
              transition: 'width 0.3s ease'
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
