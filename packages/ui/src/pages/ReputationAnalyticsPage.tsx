import React from 'react';
import { designTokens } from '../tokens.js';
import { ReputationAnalyticsReport } from '@localpilot/contracts';

export interface ReputationAnalyticsPageProps {
  report: ReputationAnalyticsReport;
}

export const ReputationAnalyticsPage: React.FC<ReputationAnalyticsPageProps> = ({ report }) => {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: designTokens.typography.fontBody }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', color: designTokens.colors.ink, margin: '0 0 8px 0', fontFamily: designTokens.typography.fontDisplay }}>
          Transparent Reputation Analytics
        </h1>
        <p style={{ color: designTokens.colors.textSecondary, margin: 0 }}>
          Authorized metrics, verified Google ratings, and transparent sample distributions.
        </p>
      </header>

      {/* Sparse data callout */}
      {report.sampledWindow.isSparseData && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fefce8',
            border: '1px solid #fef08a',
            padding: '16px',
            borderRadius: designTokens.radii.control,
            marginBottom: '24px',
            color: '#854d0e',
            fontSize: '14px'
          }}
        >
          <strong>⚠️ Sparse Sample Notice:</strong> {report.sampledWindow.sparseDataConfidenceDisclaimer}
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Official Google Rating Card */}
        <div style={{ padding: '20px', backgroundColor: '#fff', border: `1px solid ${designTokens.colors.border}`, borderRadius: designTokens.radii.card, boxShadow: designTokens.shadows.card }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '6px' }}>
            OFFICIAL GOOGLE RATING (ALL-TIME)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: designTokens.colors.ink }}>
            {report.officialProviderRating.toFixed(1)} <span style={{ color: '#eab308' }}>★</span>
          </div>
          <div style={{ fontSize: '13px', color: designTokens.colors.textSecondary, marginTop: '4px' }}>
            Based on all {report.officialProviderReviewCount} official reviews on Google
          </div>
        </div>

        {/* Sample Window Rating Card */}
        <div style={{ padding: '20px', backgroundColor: designTokens.colors.surfaceSoft, border: `1px solid ${designTokens.colors.border}`, borderRadius: designTokens.radii.card, boxShadow: designTokens.shadows.card }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '6px' }}>
            SAMPLED WINDOW AVERAGE (30 DAYS)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: designTokens.colors.ink }}>
            {report.sampledWindow.sampleAverageRating.toFixed(1)} <span style={{ color: '#eab308' }}>★</span>
          </div>
          <div style={{ fontSize: '13px', color: designTokens.colors.textSecondary, marginTop: '4px' }}>
            Sample size: {report.sampledWindow.sampleSize} accessible reviews (not overall rating)
          </div>
        </div>

        {/* Response Coverage Card */}
        <div style={{ padding: '20px', backgroundColor: '#fff', border: `1px solid ${designTokens.colors.border}`, borderRadius: designTokens.radii.card, boxShadow: designTokens.shadows.card }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '6px' }}>
            RESPONSE COVERAGE
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: designTokens.colors.brand600 }}>
            {report.responseCoverage.coveragePercent}%
          </div>
          <div style={{ fontSize: '13px', color: designTokens.colors.textSecondary, marginTop: '4px' }}>
            {report.responseCoverage.repliedReviewCount} of {report.responseCoverage.accessibleReviewCount} reviews replied
          </div>
        </div>

        {/* Median Response Time */}
        <div style={{ padding: '20px', backgroundColor: '#fff', border: `1px solid ${designTokens.colors.border}`, borderRadius: designTokens.radii.card, boxShadow: designTokens.shadows.card }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: designTokens.colors.textMuted, marginBottom: '6px' }}>
            MEDIAN RESPONSE TIME
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: designTokens.colors.ink }}>
            {report.knownResponseTime.medianResponseHours !== null ? `${report.knownResponseTime.medianResponseHours}h` : 'N/A'}
          </div>
          <div style={{ fontSize: '13px', color: designTokens.colors.textSecondary, marginTop: '4px' }}>
            Across {report.knownResponseTime.measuredEventsCount} verified reply events
          </div>
        </div>
      </div>

      {/* Workflow Edit Rate & AI Oversight */}
      <section style={{ padding: '20px', backgroundColor: '#fff', border: `1px solid ${designTokens.colors.border}`, borderRadius: designTokens.radii.card, marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px 0', color: designTokens.colors.ink }}>
          Owner Oversight & AI Draft Quality
        </h2>
        <p style={{ fontSize: '14px', color: designTokens.colors.textSecondary, margin: '0 0 16px 0' }}>
          Owners actively review responses. The edit rate reflects how often AI drafts are tailored before public signoff.
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Drafts Generated</div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>{report.draftWorkflowStats.totalDraftsGenerated}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Approved As-Is</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#166534' }}>{report.draftWorkflowStats.approvedAsIsCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: designTokens.colors.textMuted }}>Edited by Owner</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: designTokens.colors.brand700 }}>{report.draftWorkflowStats.editedByOwnerCount} ({report.draftWorkflowStats.editRatePercent}%)</div>
          </div>
        </div>
      </section>

      {/* Anomalies section without fraud accusations */}
      {report.anomalies.length > 0 && (
        <section style={{ padding: '20px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: designTokens.radii.card, marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#1e40af' }}>
            🔍 Volume Shift Observation
          </h2>
          {report.anomalies.map((anom, idx) => (
            <p key={idx} style={{ margin: 0, fontSize: '14px', color: '#1e3a8a' }}>
              {anom.description} (Categorized as <code>{anom.classification}</code> — marked for factual inspection without alleging improper behavior).
            </p>
          ))}
        </section>
      )}

      {/* Anti-gating policy disclaimer footer */}
      <footer style={{ padding: '16px', backgroundColor: designTokens.colors.surfaceSoft, borderRadius: designTokens.radii.control, border: `1px solid ${designTokens.colors.border}`, fontSize: '12px', color: designTokens.colors.textMuted }}>
        <strong>Policy Guard:</strong> {report.antiGatingRuleDisclaimer}
      </footer>
    </div>
  );
};
