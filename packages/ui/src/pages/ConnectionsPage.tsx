import React from 'react';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';

export interface ConnectionCapabilityCardProps {
  providerName: string;
  providerId: string;
  isConnected: boolean;
  isReconnectRequired: boolean;
  statusMessage: string;
  supportedActions: string[];
  blockedActions: string[];
  nextOwnerStep?: string;
  onConnect?: () => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

export const ConnectionCapabilityCard: React.FC<ConnectionCapabilityCardProps> = ({
  providerName,
  providerId,
  isConnected,
  isReconnectRequired,
  statusMessage,
  supportedActions,
  blockedActions,
  nextOwnerStep,
  onConnect,
  onReconnect,
  onDisconnect
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{providerName}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>
            {statusMessage}
          </p>
        </div>

        <div>
          {isConnected ? (
            <StatusBadge status="published" label="CONNECTED" />
          ) : isReconnectRequired ? (
            <StatusBadge status="failed" label="RECONNECT NEEDED" />
          ) : (
            <StatusBadge status="stale" label="DISCONNECTED" />
          )}
        </div>
      </div>

      {/* Action Support Breakdown */}
      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-ink-muted)', marginBottom: '6px' }}>
          AVAILABLE CAPABILITIES
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {supportedActions.length > 0 ? (
            supportedActions.map((action) => (
              <span
                key={action}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0'
                }}
              >
                ✓ {action}
              </span>
            ))
          ) : (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-ink-muted)' }}>None available</span>
          )}
        </div>
      </div>

      {/* Blocked / Unsupported Actions with honest explanation */}
      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '6px' }}>
          UNSUPPORTED / BLOCKED ACTIONS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {blockedActions.map((action) => (
            <span
              key={action}
              title="This action is not supported or permission scope is not granted by provider"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-subtle)',
                color: 'var(--color-ink-muted)',
                border: '1px solid var(--color-border)'
              }}
            >
              ✕ {action} (Disabled)
            </span>
          ))}
        </div>
      </div>

      {/* Next Owner Step */}
      {nextOwnerStep && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: 'var(--font-size-xs)',
            color: '#1e40af'
          }}
        >
          <strong>Next Step:</strong> {nextOwnerStep}
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'auto' }}>
        {isConnected ? (
          <Button size="sm" variant="secondary" onClick={onDisconnect}>
            Disconnect
          </Button>
        ) : isReconnectRequired ? (
          <Button size="sm" variant="primary" onClick={onReconnect}>
            Reconnect Account
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={onConnect}>
            Connect Provider
          </Button>
        )}
      </div>
    </div>
  );
};
