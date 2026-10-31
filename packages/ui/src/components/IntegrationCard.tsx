import React from 'react';
import { designTokens } from '../tokens.js';
import { Button } from './Button.js';
import { StatusBadge } from './StatusBadge.js';

export interface IntegrationCardProps {
  id: string;
  name: string;
  category: string;
  isConnected: boolean;
  isApprovalBlocked?: boolean;
  lastSyncText?: string;
  accountLabel?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  name,
  category,
  isConnected,
  isApprovalBlocked = false,
  lastSyncText,
  accountLabel,
  onConnect,
  onDisconnect,
  onReconnect
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
        justifyContent: 'space-between',
        gap: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3
            style={{
              margin: '0 0 4px 0',
              fontFamily: designTokens.typography.fontDisplay,
              fontSize: '16px',
              fontWeight: 700,
              color: designTokens.colors.ink
            }}
          >
            {name}
          </h3>
          <span
            style={{
              fontSize: '12px',
              fontFamily: designTokens.typography.fontBody,
              color: designTokens.colors.textMuted
            }}
          >
            {category}
          </span>
        </div>

        {isApprovalBlocked ? (
          <StatusBadge status="failed" label="Approval Pending" />
        ) : isConnected ? (
          <StatusBadge status="published" label="Connected" />
        ) : (
          <StatusBadge status="draft" label="Not Connected" />
        )}
      </div>

      <div>
        {accountLabel ? (
          <div
            style={{
              fontSize: '13px',
              fontFamily: designTokens.typography.fontBody,
              color: designTokens.colors.ink,
              fontWeight: 500,
              marginBottom: '4px'
            }}
          >
            Account: {accountLabel}
          </div>
        ) : null}
        {lastSyncText ? (
          <div
            style={{
              fontSize: '12px',
              fontFamily: designTokens.typography.fontBody,
              color: designTokens.colors.textMuted
            }}
          >
            Last activity: {lastSyncText}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        {isApprovalBlocked ? (
          <Button variant="secondary" size="sm" onClick={onReconnect}>
            View API Status
          </Button>
        ) : isConnected ? (
          <>
            <Button variant="secondary" size="sm" onClick={onReconnect}>
              Re-sync
            </Button>
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onConnect}>
            Connect Account
          </Button>
        )}
      </div>
    </div>
  );
};
