import React from 'react';
import { designTokens } from '../tokens.js';

export type SemanticStatus =
  | 'draft'
  | 'pending'
  | 'needs_review'
  | 'published'
  | 'failed'
  | 'stale';

export interface StatusBadgeProps {
  status: SemanticStatus;
  label?: string;
}

const statusConfigs: Record<
  SemanticStatus,
  { label: string; bg: string; color: string; border: string; icon: string }
> = {
  draft: {
    label: 'Draft',
    bg: '#f5f5f4',
    color: '#57534e',
    border: '#e7e5e4',
    icon: '📝'
  },
  pending: {
    label: 'Pending',
    bg: '#fef9c3',
    color: '#a16207',
    border: '#fde047',
    icon: '⏳'
  },
  needs_review: {
    label: 'Needs Review',
    bg: '#ffedd5',
    color: '#c2410c',
    border: '#fed7aa',
    icon: '⚠️'
  },
  published: {
    label: 'Published',
    bg: '#dcfce7',
    color: '#15803d',
    border: '#bbf7d0',
    icon: '✓'
  },
  failed: {
    label: 'Failed',
    bg: '#fee2e2',
    color: '#b91c1c',
    border: '#fecaca',
    icon: '✕'
  },
  stale: {
    label: 'Stale (>7d)',
    bg: '#f3f4f6',
    color: '#4b5563',
    border: '#e5e7eb',
    icon: '🔄'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = statusConfigs[status] || statusConfigs.draft;
  const displayLabel = label || config.label;

  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: designTokens.typography.fontBody,
        borderRadius: designTokens.radii.pill,
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '11px' }}>
        {config.icon}
      </span>
      {displayLabel}
    </span>
  );
};
