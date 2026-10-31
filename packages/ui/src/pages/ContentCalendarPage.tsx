import React, { useState } from 'react';
import {
  CalendarViewMode,
  CalendarScheduleItem,
  CalendarItemStatus,
  BlackoutPeriod
} from '@localpilot/contracts';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Drawer } from '../components/Drawer.js';

export interface ContentCalendarPageProps {
  items: CalendarScheduleItem[];
  blackouts: BlackoutPeriod[];
  timezone: string;
  onReschedule: (itemId: string, newDateIso: string) => void;
  onRetryFailed: (itemId: string) => void;
}

export const ContentCalendarPage: React.FC<ContentCalendarPageProps> = ({
  items,
  blackouts,
  timezone,
  onReschedule,
  onRetryFailed
}) => {
  // Mobile defaults to AGENDA; desktop defaults to MONTH
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [viewMode, setViewMode] = useState<CalendarViewMode>(isMobile ? 'AGENDA' : 'MONTH');
  const [selectedItem, setSelectedItem] = useState<CalendarScheduleItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');

  const renderStatusBadge = (status: CalendarItemStatus) => {
    switch (status) {
      case 'PLANNED':
        return <StatusBadge status="draft" label="Planned" />;
      case 'DRAFT':
        return <StatusBadge status="draft" label="Draft" />;
      case 'APPROVED':
        return <StatusBadge status="pending" label="Approved" />;
      case 'SCHEDULED':
        return <StatusBadge status="pending" label="Scheduled" />;
      case 'PROVIDER_PENDING':
        return <StatusBadge status="pending" label="Publishing..." />;
      case 'VERIFIED_PUBLISHED':
        return <StatusBadge status="published" label="Live / Published" />;
      case 'FAILED':
        return <StatusBadge status="failed" label="Publish Failed" />;
      default:
        return null;
    }
  };

  return (
    <div className="lp-content-calendar" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Content Calendar</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
            Timezone: <strong>{timezone}</strong> • {items.filter((i) => !i.isSuperseded).length} scheduled items
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['MONTH', 'WEEK', 'AGENDA'] as CalendarViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'primary' : 'secondary'}
              onClick={() => setViewMode(mode)}
              aria-label={`Switch to ${mode} view`}
            >
              {mode.charAt(0) + mode.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Blackout notice banner if any active blackouts */}
      {blackouts.length > 0 && (
        <div
          role="region"
          aria-label="Active blackout dates"
          style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#92400E'
          }}
        >
          <strong>Notice:</strong> Blackout periods configured ({blackouts.map((b) => b.reason).join(', ')}). No publishing during emergency blackout dates.
        </div>
      )}

      {/* Agenda / Schedule List */}
      <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Calendar scheduled items">
          {items
            .filter((i) => !i.isSuperseded)
            .map((item) => (
              <li
                key={item.id}
                tabIndex={0}
                role="button"
                aria-label={`${item.title} scheduled for ${new Date(item.scheduledUtc).toLocaleString()}`}
                onClick={() => setSelectedItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedItem(item);
                  }
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        background: '#EEF2FF',
                        color: '#4338CA',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}
                    >
                      {item.platform}
                    </span>
                    <strong style={{ fontSize: '15px' }}>{item.title}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    {new Date(item.scheduledUtc).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}{' '}
                    ({item.timezone})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {renderStatusBadge(item.status)}
                  <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Est. ${item.estimatedCostUsd.toFixed(2)}</span>
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* Preview / Detail Drawer */}
      <Drawer
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `Schedule Details: ${selectedItem.title}` : 'Schedule Item Details'}
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Title</label>
              <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{selectedItem.title}</div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Status</label>
              <div style={{ marginTop: '4px' }}>{renderStatusBadge(selectedItem.status)}</div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Scheduled Dispatch Time</label>
              <div style={{ fontSize: '14px', marginTop: '2px' }}>
                {new Date(selectedItem.scheduledUtc).toUTCString()} ({selectedItem.timezone})
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', display: 'block' }}>Estimated Generation & Publish Cost</label>
              <div style={{ fontSize: '14px', marginTop: '2px' }}>${selectedItem.estimatedCostUsd.toFixed(2)} USD</div>
            </div>

            {selectedItem.failureReason && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px', borderRadius: '6px' }}>
                <strong style={{ color: '#991B1B', fontSize: '13px' }}>Publish Failure Reason:</strong>
                <p style={{ margin: '4px 0 8px 0', fontSize: '13px', color: '#B91C1C' }}>{selectedItem.failureReason}</p>
                <Button variant="danger" onClick={() => onRetryFailed(selectedItem.id)}>
                  Retry Publication Step
                </Button>
              </div>
            )}

            {/* Accessible Rescheduling Section (keyboard alternative to drag-and-drop) */}
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>Accessible Reschedule</h3>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 10px 0' }}>
                Select new dispatch time. Supersedes previous schedule entry so old time cannot publish.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="datetime-local"
                  aria-label="New scheduled date and time"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                />
                <Button
                  variant="primary"
                  disabled={!rescheduleDate}
                  onClick={() => {
                    if (rescheduleDate) {
                      onReschedule(selectedItem.id, new Date(rescheduleDate).toISOString());
                      setSelectedItem(null);
                    }
                  }}
                >
                  Confirm Reschedule
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
