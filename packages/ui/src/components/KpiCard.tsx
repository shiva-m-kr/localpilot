import React from 'react';
import { designTokens } from '../tokens.js';

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  periodText?: string;
  sourceText?: string;
  changeDelta?: {
    percentage: number;
    isPositive: boolean;
  };
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  periodText,
  sourceText,
  changeDelta
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: designTokens.radii.card,
        padding: '20px',
        border: `1px solid ${designTokens.colors.border}`,
        boxShadow: designTokens.shadows.card,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '220px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: designTokens.typography.fontBody,
            fontSize: '13px',
            fontWeight: 500,
            color: designTokens.colors.textSecondary
          }}
        >
          {title}
        </span>
        {sourceText ? (
          <span
            style={{
              fontSize: '11px',
              fontFamily: designTokens.typography.fontBody,
              padding: '2px 6px',
              borderRadius: designTokens.radii.control,
              backgroundColor: designTokens.colors.surfaceSoft,
              color: designTokens.colors.action
            }}
          >
            {sourceText}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          style={{
            fontFamily: designTokens.typography.fontDisplay,
            fontSize: '30px',
            lineHeight: '38px',
            fontWeight: 700,
            color: designTokens.colors.ink,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              fontFamily: designTokens.typography.fontBody,
              fontSize: '14px',
              color: designTokens.colors.textMuted
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {periodText ? (
          <span
            style={{
              fontFamily: designTokens.typography.fontBody,
              fontSize: '12px',
              color: designTokens.colors.textMuted
            }}
          >
            {periodText}
          </span>
        ) : null}
        {changeDelta ? (
          <span
            style={{
              fontFamily: designTokens.typography.fontBody,
              fontSize: '12px',
              fontWeight: 600,
              color: changeDelta.isPositive ? designTokens.colors.success : designTokens.colors.danger
            }}
          >
            {changeDelta.isPositive ? '+' : ''}{changeDelta.percentage}%
          </span>
        ) : null}
      </div>
    </div>
  );
};
