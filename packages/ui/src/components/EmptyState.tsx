import React from 'react';
import { designTokens } from '../tokens.js';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📂',
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: designTokens.colors.surfaceSoft,
        borderRadius: designTokens.radii.card,
        border: `1px dashed ${designTokens.colors.brand200}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '480px',
        margin: '0 auto'
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '4px' }}>{icon}</div>
      <h3
        style={{
          fontFamily: designTokens.typography.fontDisplay,
          fontSize: '18px',
          fontWeight: 700,
          color: designTokens.colors.ink,
          margin: 0
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: designTokens.typography.fontBody,
          fontSize: '14px',
          color: designTokens.colors.textSecondary,
          margin: 0,
          lineHeight: '22px'
        }}
      >
        {description}
      </p>
      {actionLabel && onAction ? (
        <div style={{ marginTop: '8px' }}>
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
