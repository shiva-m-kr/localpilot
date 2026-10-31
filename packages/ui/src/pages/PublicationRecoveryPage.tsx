import React, { useState } from 'react';
import {
  PublicationIncidentRecord,
  IncidentResolutionAction
} from '@localpilot/contracts';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Drawer } from '../components/Drawer.js';

export interface PublicationRecoveryPageProps {
  incidents: PublicationIncidentRecord[];
  onReconcile: (incidentId: string) => void;
  onResolve: (incidentId: string, action: IncidentResolutionAction) => void;
}

export const PublicationRecoveryPage: React.FC<PublicationRecoveryPageProps> = ({
  incidents,
  onReconcile,
  onResolve
}) => {
  const [selectedIncident, setSelectedIncident] = useState<PublicationIncidentRecord | null>(null);

  const getStatusBadge = (incident: PublicationIncidentRecord) => {
    switch (incident.status) {
      case 'RECONCILED_SUCCESS':
        return <StatusBadge status="published" label="Verified Published" />;
      case 'CANCELLED_BY_OPERATOR':
        return <StatusBadge status="stale" label="Cancelled by Owner" />;
      case 'RETRY_BOUNDED_STEP':
        return <StatusBadge status="pending" label="Retry Queued" />;
      case 'NEEDS_OPERATOR_REVIEW':
      default:
        return <StatusBadge status="failed" label="Needs Intervention" />;
    }
  };

  return (
    <div className="lp-recovery-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Publication Recovery & Intervention</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
          Inspect unacknowledged dispatches, remote drifts, and timeout recovery without duplicating side effects.
        </p>
      </div>

      {incidents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <strong style={{ fontSize: '16px', color: '#374151' }}>All publication dispatches healthy</strong>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: '8px 0 0 0' }}>No pending recovery incidents or dead-letter jobs.</p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Provider</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Incident Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Attempts</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#4B5563' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.incidentId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{incident.provider.toUpperCase()}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{incident.incidentType}</td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(incident)}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                    {incident.stepAttemptCount} / {incident.maxStepRetries}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedIncident(incident)}
                        aria-label={`Inspect incident ${incident.incidentId.slice(0, 8)}`}
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => onReconcile(incident.incidentId)}
                        aria-label={`Reconcile incident ${incident.incidentId.slice(0, 8)}`}
                      >
                        Reconcile
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect & Resolution Drawer */}
      <Drawer
        isOpen={selectedIncident !== null}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident ? `Incident Resolution: ${selectedIncident.provider} (${selectedIncident.incidentId.slice(0, 8)})` : 'Incident Resolution'}
      >
        {selectedIncident && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Summary</label>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B91C1C' }}>{selectedIncident.errorSummary}</p>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Expected SHA-256 Hash</label>
              <code style={{ fontSize: '12px', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                {selectedIncident.expectedHash.slice(0, 16)}...
              </code>
            </div>

            {selectedIncident.actualRemoteHash && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Actual Remote Hash</label>
                <code style={{ fontSize: '12px', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                  {selectedIncident.actualRemoteHash.slice(0, 16)}...
                </code>
              </div>
            )}

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0' }}>Operator Interventions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="primary"
                  onClick={() => {
                    onResolve(selectedIncident.incidentId, 'FORCE_RETRY_STEP');
                    setSelectedIncident(null);
                  }}
                >
                  Retry Bounded Step ({selectedIncident.stepAttemptCount}/{selectedIncident.maxStepRetries})
                </Button>

                {selectedIncident.incidentType === 'REMOTE_CONTENT_DRIFT' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onResolve(selectedIncident.incidentId, 'ADOPT_REMOTE_CONTENT');
                      setSelectedIncident(null);
                    }}
                  >
                    Adopt Remote Content (Protect Manual Edits)
                  </Button>
                )}

                <Button
                  variant="danger"
                  onClick={() => {
                    onResolve(selectedIncident.incidentId, 'CANCEL_DISPATCH');
                    setSelectedIncident(null);
                  }}
                >
                  Cancel Dispatch & Discard
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
