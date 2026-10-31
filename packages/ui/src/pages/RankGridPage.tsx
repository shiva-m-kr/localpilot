import React, { useState } from 'react';
import {
  ScanRunExecution,
  PointObservation,
  VisibilityMetrics
} from '@localpilot/contracts';
import { Button } from '../components/Button.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Drawer } from '../components/Drawer.js';

export interface RankGridPageProps {
  runs: ScanRunExecution[];
  currentRun: ScanRunExecution;
  metrics: VisibilityMetrics;
  onSelectKeyword: (keyword: string) => void;
  onRetryPartial: (runId: string) => void;
}

export const RankGridPage: React.FC<RankGridPageProps> = ({
  runs,
  currentRun,
  metrics,
  onSelectKeyword,
  onRetryPartial
}) => {
  const [selectedPoint, setSelectedPoint] = useState<PointObservation | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Dimension: sqrt of total points
  const dimension = Math.round(Math.sqrt(currentRun.totalPoints)) || 5;

  const getPointColor = (obs: PointObservation): { bg: string; text: string; label: string; symbol: string } => {
    if (obs.state === 'TASK_FAILED') {
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Error', symbol: '!' };
    }
    if (obs.state === 'NOT_FOUND_IN_DEPTH') {
      return { bg: '#F3F4F6', text: '#6B7280', label: '20+', symbol: '>20' };
    }
    if (obs.rank !== null) {
      if (obs.rank <= 3) {
        return { bg: '#DCFCE7', text: '#166534', label: `#${obs.rank}`, symbol: String(obs.rank) };
      }
      if (obs.rank <= 10) {
        return { bg: '#FEF3C7', text: '#92400E', label: `#${obs.rank}`, symbol: String(obs.rank) };
      }
      return { bg: '#E0E7FF', text: '#3730A3', label: `#${obs.rank}`, symbol: String(obs.rank) };
    }
    return { bg: '#F3F4F6', text: '#9CA3AF', label: '—', symbol: '—' };
  };

  const pointCompetitors = selectedPoint
    ? currentRun.extractedCompetitors.filter((c) => c.observedAtPointIndex === selectedPoint.pointIndex)
    : [];

  return (
    <div className="lp-rank-grid" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Local Ranking Grid</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
            Keyword: <strong>{currentRun.keyword}</strong> • {currentRun.totalPoints} sampling points
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={viewMode === 'GRID' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('GRID')}
            aria-label="View as interactive grid"
          >
            Grid View
          </Button>
          <Button
            variant={viewMode === 'TABLE' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('TABLE')}
            aria-label="View as accessible table alternative"
          >
            Table Alternative
          </Button>
        </div>
      </div>

      {/* Partial Failure Notice */}
      {currentRun.status === 'PARTIAL_FAILURE' && (
        <div
          role="alert"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong style={{ color: '#92400E' }}>Partial Provider Failure Detected:</strong>
            <span style={{ color: '#B45309', marginLeft: '6px' }}>
              {currentRun.failedPoints} point(s) encountered provider task errors. Excluded from coverage calculations.
            </span>
          </div>
          <Button variant="secondary" onClick={() => onRetryPartial(currentRun.runId)}>
            Retry {currentRun.failedPoints} Failed Point(s)
          </Button>
        </div>
      )}

      {/* Summary KPI Bar with Denominator Transparency */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>Top 3 Coverage</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534', marginTop: '4px' }}>
            {metrics.top3CoveragePercent !== null ? `${metrics.top3CoveragePercent}%` : 'Unavailable'}
          </div>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{metrics.top3PointsCount} of {metrics.evaluablePointsCount} evaluable points</span>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>Average Found Rank</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {metrics.averageFoundRank !== null ? `#${metrics.averageFoundRank}` : '—'}
          </div>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Across {metrics.foundPointsCount} found positions</span>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>Labeled Capped Rank</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#4B5563', marginTop: '4px' }}>
            {metrics.labeledCappedAverageRank !== null ? `#${metrics.labeledCappedAverageRank}` : '—'}
          </div>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Unranked capped at #{metrics.cappedDepthValue}</span>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>Scan Health</span>
          <div style={{ marginTop: '8px' }}>
            {currentRun.status === 'COMPLETED_SUCCESS' && <StatusBadge status="published" label="Verified Complete" />}
            {currentRun.status === 'PARTIAL_FAILURE' && <StatusBadge status="needs_review" label="Partial Scan" />}
            {currentRun.status === 'FAILED' && <StatusBadge status="failed" label="Scan Failed" />}
          </div>
          <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginTop: '4px' }}>
            {metrics.denominatorFormulaText}
          </span>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'GRID' ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* Non-color Legend */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#DCFCE7', border: '1px solid #166534', display: 'inline-block' }} />
              <strong>Top 3 (#1 - #3)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#FEF3C7', border: '1px solid #92400E', display: 'inline-block' }} />
              <strong>Top 10 (#4 - #10)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#F3F4F6', border: '1px solid #6B7280', display: 'inline-block' }} />
              <strong>Not Found (&gt;20)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#FEE2E2', border: '1px solid #991B1B', display: 'inline-block' }} />
              <strong>Task Error (!)</strong>
            </div>
          </div>

          {/* Grid Matrix */}
          <div
            role="grid"
            aria-label={`Rank grid ${dimension} by ${dimension}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${dimension}, 64px)`,
              gap: '12px'
            }}
          >
            {currentRun.observations.map((obs) => {
              const style = getPointColor(obs);
              const isSelected = selectedPoint?.pointIndex === obs.pointIndex;

              return (
                <button
                  key={obs.pointIndex}
                  tabIndex={0}
                  role="gridcell"
                  aria-label={`Point ${obs.pointIndex}: ${style.label} (${obs.state})`}
                  onClick={() => setSelectedPoint(obs)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: style.bg,
                    border: isSelected ? '3px solid #F97316' : `1px solid ${style.text}`,
                    color: style.text,
                    fontWeight: 700,
                    fontSize: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: isSelected ? '0 0 0 3px rgba(249, 115, 22, 0.3)' : 'none'
                  }}
                >
                  <span>{style.symbol}</span>
                  <span style={{ fontSize: '9px', fontWeight: 500 }}>pt {obs.pointIndex}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Accessible Table Alternative */
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Point Index</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Coordinates</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Rank</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {currentRun.observations.map((obs) => (
                <tr key={obs.pointIndex} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>#{obs.pointIndex}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                    {obs.latitude.toFixed(4)}, {obs.longitude.toFixed(4)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{obs.state}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    {obs.rank !== null ? `#${obs.rank}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Button variant="secondary" onClick={() => setSelectedPoint(obs)}>
                      Inspect Point
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Point Competitor Inspector Drawer */}
      <Drawer
        isOpen={selectedPoint !== null}
        onClose={() => setSelectedPoint(null)}
        title={selectedPoint ? `Point #${selectedPoint.pointIndex} SERP Observations` : 'Point Details'}
      >
        {selectedPoint && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Geographic Coordinates</span>
              <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                Lat: {selectedPoint.latitude}, Lng: {selectedPoint.longitude}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Target Business Rank</span>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px', color: selectedPoint.rank ? '#166534' : '#6B7280' }}>
                {selectedPoint.rank !== null ? `Rank #${selectedPoint.rank}` : selectedPoint.state}
              </div>
            </div>

            {selectedPoint.taskError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px', borderRadius: '6px' }}>
                <strong style={{ color: '#991B1B', fontSize: '13px' }}>Provider Task Error:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#B91C1C' }}>{selectedPoint.taskError}</p>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '12px 0 8px 0' }}>
                Competitors Observed at this Point ({pointCompetitors.length})
              </h3>
              {pointCompetitors.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#6B7280' }}>No competitor observations logged for this point.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {pointCompetitors.map((comp) => (
                    <li
                      key={comp.placeId}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '14px' }}>{comp.businessName}</strong>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          ★ {comp.rating?.toFixed(1) || '—'} ({comp.reviewCount || 0} reviews)
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>
                        Rank #{comp.rank}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
