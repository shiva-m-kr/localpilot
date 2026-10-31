import React from 'react';
import { designTokens } from '../tokens.js';

export interface CostFreshnessIndicatorProps {
  sourceName: string;
  observedAt: Date | string;
  creditsCost?: number;
  isStale?: boolean;
}

export const CostFreshnessIndicator: React.FC<CostFreshnessIndicatorProps> = ({
  sourceName,
  observedAt,
  creditsCost,
  isStale = false
}) => {
  const dateObj = typeof observedAt === 'string' ? new Date(observedAt) : observedAt;
  const timeFormatted = dateObj.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 10px',
        borderRadius: designTokens.radii.pill,
        backgroundColor: isStale ? '#fef2f2' : designTokens.colors.surfaceSoft,
        border: `1px solid ${isStale ? '#fecaca' : designTokens.colors.brand200}`,
        fontSize: '12px',
        fontFamily: designTokens.typography.fontBody,
        color: isStale ? designTokens.colors.danger : designTokens.colors.textSecondary
      }}
    >
      <span style={{ fontWeight: 600, color: designTokens.colors.ink }}>
        {sourceName}
      </span>
      <span>•</span>
      <span>
        {isStale ? '⚠️ Stale: ' : 'Freshness: '}
        {timeFormatted}
      </span>
      {creditsCost !== undefined ? (
        <>
          <span>•</span>
          <span style={{ fontWeight: 600, color: designTokens.colors.action }}>
            🪙 {creditsCost} credits
          </span>
        </>
      ) : null}
    </div>
  );
};
